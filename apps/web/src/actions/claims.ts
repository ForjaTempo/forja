"use server";

import { getDb, schema } from "@forja/db";
import { and, count, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { isAddress } from "viem";
import {
	CANARY_WINDOW_SECONDS,
	CLAIM_CAP_USD,
	CLAIMER_DEPLOY_TIMESTAMP,
	FORJA_CLAIMER_ADDRESS,
	MAX_ACTIVE_CAMPAIGNS_PER_WALLET,
	TIP20_DECIMALS,
} from "@/lib/constants";
import { isValidSlug, normalizeSlug } from "@/lib/merkle";
import { requireAuth } from "@/lib/session";

/**
 * Campaign banner URLs must resolve to our own MinIO-backed /api/images/ path
 * OR to forja.fun itself (creator chose an uploaded banner). Allowing any
 * `https://` URL let a creator embed a third-party tracking pixel on the claim
 * page — IPs of every visitor would leak to that domain. Matching profile
 * banner behaviour (actions/profile.ts:91).
 */
const BANNER_PATH_RE = /^\/api\/images\/[a-z0-9/_.-]+$/i;
const BANNER_URL_RE = /^https:\/\/(?:forja\.fun|www\.forja\.fun)\/api\/images\/[a-z0-9/_.-]+$/i;

function isValidBannerUrl(value: string): boolean {
	return BANNER_PATH_RE.test(value) || BANNER_URL_RE.test(value);
}
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_LIKE_RE = /^0x[a-fA-F0-9]{40}$/;

export interface ValidateSlugResult {
	ok: boolean;
	reason?: string;
}

export async function validateSlug(rawSlug: string): Promise<ValidateSlugResult> {
	const slug = normalizeSlug(rawSlug ?? "");
	if (!isValidSlug(slug)) {
		return {
			ok: false,
			reason: "Slug must be 3-40 chars (a-z, 0-9, hyphen) and start/end alphanumeric",
		};
	}
	try {
		const db = getDb();
		const existing = await db
			.select({ id: schema.claimCampaigns.id })
			.from(schema.claimCampaigns)
			.where(eq(schema.claimCampaigns.slug, slug))
			.limit(1);
		if (existing.length > 0) {
			return { ok: false, reason: "Slug already taken" };
		}
		return { ok: true };
	} catch (err) {
		console.error("[claims] validateSlug failed:", err);
		return { ok: false, reason: "Could not check slug availability" };
	}
}

export interface CampaignQuotaResult {
	activeCount: number;
	atLimit: boolean;
}

export async function checkCampaignQuota(creatorAddress: string): Promise<CampaignQuotaResult> {
	if (!isAddress(creatorAddress)) {
		return { activeCount: 0, atLimit: false };
	}
	try {
		const db = getDb();
		const addr = creatorAddress.toLowerCase();
		const now = new Date();
		const [row] = await db
			.select({ value: count() })
			.from(schema.claimCampaigns)
			.where(
				and(
					eq(schema.claimCampaigns.creatorAddress, addr),
					eq(schema.claimCampaigns.swept, false),
					or(isNull(schema.claimCampaigns.endTime), gt(schema.claimCampaigns.endTime, now)),
				),
			);
		const activeCount = row?.value ?? 0;
		return {
			activeCount,
			atLimit: activeCount >= MAX_ACTIVE_CAMPAIGNS_PER_WALLET,
		};
	} catch (err) {
		console.error("[claims] checkCampaignQuota failed:", err);
		return { activeCount: 0, atLimit: false };
	}
}

export interface StoreCampaignProofInput {
	recipientAddress: string;
	amount: string;
	proof: string[];
	leafIndex: number;
}

export interface StoreCampaignInput {
	campaignId: string; // bigint as string
	slug: string;
	creatorAddress: string;
	tokenAddress: string;
	tokenDecimals?: number;
	merkleRoot: string;
	totalDeposited: string;
	recipientCount: number;
	title: string;
	description?: string | null;
	bannerUrl?: string | null;
	startTime: number; // unix seconds
	endTime: number | null; // unix seconds, null = no expiry
	sweepEnabled: boolean;
	createdBlock: number;
	createdTxHash: string;
	leaves: StoreCampaignProofInput[];
}

export interface StoreCampaignResult {
	ok: boolean;
	id?: number;
	error?: string;
}

export async function storeCampaign(input: StoreCampaignInput): Promise<StoreCampaignResult> {
	// Hard gate: never write a campaign row before ForjaClaimer is deployed.
	if (FORJA_CLAIMER_ADDRESS === "0x" || !isAddress(FORJA_CLAIMER_ADDRESS)) {
		return { ok: false, error: "Claim campaigns are not yet available on this network" };
	}
	// Basic validation
	if (!input || typeof input !== "object") return { ok: false, error: "Invalid input" };
	if (!isAddress(input.creatorAddress)) return { ok: false, error: "Invalid creator address" };
	if (!isAddress(input.tokenAddress)) return { ok: false, error: "Invalid token address" };

	// Auth guard: the caller must hold a session proving they own the creatorAddress.
	// Without this, anyone could insert a campaign row under someone else's wallet
	// (slug squatting, attribution fraud, DB noise). requireAuth lowercases internally.
	const authCheck = await requireAuth(input.creatorAddress);
	if (!authCheck.ok) {
		return { ok: false, error: "Wallet authentication required" };
	}
	if (!TX_HASH_RE.test(input.createdTxHash)) return { ok: false, error: "Invalid tx hash" };
	if (!input.merkleRoot.startsWith("0x") || input.merkleRoot.length !== 66) {
		return { ok: false, error: "Invalid merkle root" };
	}
	if (!Number.isFinite(input.recipientCount) || input.recipientCount <= 0) {
		return { ok: false, error: "Invalid recipient count" };
	}
	if (!Array.isArray(input.leaves) || input.leaves.length === 0) {
		return { ok: false, error: "Missing leaves" };
	}
	if (!input.title || input.title.length === 0 || input.title.length > 80) {
		return { ok: false, error: "Title required (1-80 chars)" };
	}
	if (input.description && input.description.length > 300) {
		return { ok: false, error: "Description too long (max 300)" };
	}
	if (input.bannerUrl && !isValidBannerUrl(input.bannerUrl)) {
		return {
			ok: false,
			error: "Banner must be an uploaded image (/api/images/...)",
		};
	}

	const slug = normalizeSlug(input.slug);
	const slugCheck = await validateSlug(slug);
	if (!slugCheck.ok) return { ok: false, error: slugCheck.reason ?? "Invalid slug" };

	const quota = await checkCampaignQuota(input.creatorAddress);
	if (quota.atLimit) {
		return {
			ok: false,
			error: `You already have ${quota.activeCount} active campaigns (max ${MAX_ACTIVE_CAMPAIGNS_PER_WALLET})`,
		};
	}

	// Canary cap (first-week deposit limit). Only enforced when CLAIMER_DEPLOY_TIMESTAMP is set.
	if (CLAIMER_DEPLOY_TIMESTAMP > 0) {
		const nowSec = Math.floor(Date.now() / 1000);
		if (nowSec - CLAIMER_DEPLOY_TIMESTAMP < CANARY_WINDOW_SECONDS) {
			try {
				const decimals = input.tokenDecimals ?? TIP20_DECIMALS;
				const totalUnits = BigInt(input.totalDeposited);
				const denom = 10n ** BigInt(decimals);
				const wholeUnits = Number(totalUnits / denom);
				if (wholeUnits > CLAIM_CAP_USD) {
					return {
						ok: false,
						error: `Canary cap: max ${CLAIM_CAP_USD} whole units per campaign in first week`,
					};
				}
			} catch {
				return { ok: false, error: "Could not evaluate canary cap" };
			}
		}
	}

	// Validate every leaf up-front so we fail fast before touching the DB.
	const contractAddr = FORJA_CLAIMER_ADDRESS.toLowerCase();
	const proofRows: Array<{
		recipientAddress: string;
		amount: string;
		proof: string;
		leafIndex: number;
	}> = [];
	for (const l of input.leaves) {
		if (!ADDRESS_LIKE_RE.test(l.recipientAddress)) {
			return { ok: false, error: `Invalid recipient address: ${l.recipientAddress}` };
		}
		proofRows.push({
			recipientAddress: l.recipientAddress.toLowerCase(),
			amount: l.amount,
			proof: JSON.stringify(l.proof),
			leafIndex: l.leafIndex,
		});
	}

	const BATCH = 500;

	try {
		const db = getDb();

		// One transaction: insert campaign row (or find existing) + insert all proofs.
		// Reconcile path: if the row already exists, we still attempt to insert every proof
		// with onConflictDoNothing. This is idempotent and backfills any leaves that are
		// missing from a previous partial attempt (e.g. tab closed mid-flow).
		const campaignDbId = await db.transaction(async (tx) => {
			const inserted = await tx
				.insert(schema.claimCampaigns)
				.values({
					contractAddress: contractAddr,
					campaignId: input.campaignId,
					slug,
					creatorAddress: input.creatorAddress.toLowerCase(),
					tokenAddress: input.tokenAddress.toLowerCase(),
					merkleRoot: input.merkleRoot.toLowerCase(),
					totalDeposited: input.totalDeposited,
					recipientCount: input.recipientCount,
					title: input.title,
					description: input.description ?? null,
					bannerUrl: input.bannerUrl ?? null,
					startTime: new Date(input.startTime * 1000),
					endTime: input.endTime ? new Date(input.endTime * 1000) : null,
					sweepEnabled: input.sweepEnabled,
					createdBlock: input.createdBlock,
					createdTxHash: input.createdTxHash.toLowerCase(),
				})
				.onConflictDoNothing({
					target: [schema.claimCampaigns.contractAddress, schema.claimCampaigns.campaignId],
				})
				.returning({ id: schema.claimCampaigns.id });

			let dbId: number | undefined = inserted[0]?.id;
			if (!dbId) {
				const [existing] = await tx
					.select({ id: schema.claimCampaigns.id })
					.from(schema.claimCampaigns)
					.where(
						and(
							eq(schema.claimCampaigns.contractAddress, contractAddr),
							eq(schema.claimCampaigns.campaignId, input.campaignId),
						),
					)
					.limit(1);
				dbId = existing?.id;
				if (!dbId) {
					throw new Error("Insert conflict and no existing row");
				}
			}

			for (let i = 0; i < proofRows.length; i += BATCH) {
				const slice = proofRows.slice(i, i + BATCH).map((r) => ({
					campaignDbId: dbId,
					recipientAddress: r.recipientAddress,
					amount: r.amount,
					proof: r.proof,
					leafIndex: r.leafIndex,
				}));
				await tx
					.insert(schema.claimProofs)
					.values(slice)
					.onConflictDoNothing({
						target: [schema.claimProofs.campaignDbId, schema.claimProofs.recipientAddress],
					});
			}

			// Sanity check: total proofs now in DB must cover recipient count.
			// If a caller sends a smaller leaves list than the original, we'd spot it here.
			const [{ value: storedCount = 0 } = { value: 0 }] = await tx
				.select({ value: count() })
				.from(schema.claimProofs)
				.where(eq(schema.claimProofs.campaignDbId, dbId));
			if (storedCount < input.recipientCount) {
				throw new Error(`Proof backfill incomplete: ${storedCount}/${input.recipientCount} leaves`);
			}

			return dbId;
		});

		return { ok: true, id: campaignDbId };
	} catch (err) {
		console.error("[claims] storeCampaign failed:", err);
		const message = err instanceof Error ? err.message : "Database write failed";
		return { ok: false, error: message };
	}
}

export type ClaimCampaignRow = typeof schema.claimCampaigns.$inferSelect;

export async function getCampaignBySlug(rawSlug: string): Promise<ClaimCampaignRow | null> {
	const slug = normalizeSlug(rawSlug ?? "");
	if (!isValidSlug(slug)) return null;
	try {
		const db = getDb();
		const [row] = await db
			.select()
			.from(schema.claimCampaigns)
			.where(eq(schema.claimCampaigns.slug, slug))
			.limit(1);
		return row ?? null;
	} catch (err) {
		console.error("[claims] getCampaignBySlug failed:", err);
		return null;
	}
}

export interface ProofForWalletResult {
	amount: string;
	proof: string[];
	leafIndex: number;
	claimedAt: Date | null;
	claimedTxHash: string | null;
}

/**
 * Returns the proof row for a single wallet only. Recipient privacy: never expose
 * the full recipient list.
 */
export async function getProofForWallet(
	campaignDbId: number,
	wallet: string,
): Promise<ProofForWalletResult | null> {
	if (!isAddress(wallet)) return null;
	if (!Number.isFinite(campaignDbId) || campaignDbId <= 0) return null;
	try {
		const db = getDb();
		const [row] = await db
			.select({
				amount: schema.claimProofs.amount,
				proof: schema.claimProofs.proof,
				leafIndex: schema.claimProofs.leafIndex,
				claimedAt: schema.claimProofs.claimedAt,
				claimedTxHash: schema.claimProofs.claimedTxHash,
			})
			.from(schema.claimProofs)
			.where(
				and(
					eq(schema.claimProofs.campaignDbId, campaignDbId),
					eq(schema.claimProofs.recipientAddress, wallet.toLowerCase()),
				),
			)
			.limit(1);
		if (!row) return null;
		let parsedProof: string[] = [];
		try {
			const candidate = JSON.parse(row.proof);
			if (Array.isArray(candidate)) parsedProof = candidate.map((p) => String(p));
		} catch {
			parsedProof = [];
		}
		return {
			amount: row.amount,
			proof: parsedProof,
			leafIndex: row.leafIndex,
			claimedAt: row.claimedAt,
			claimedTxHash: row.claimedTxHash,
		};
	} catch (err) {
		console.error("[claims] getProofForWallet failed:", err);
		return null;
	}
}

export async function getCampaignsByCreator(creator: string): Promise<ClaimCampaignRow[]> {
	if (!isAddress(creator)) return [];
	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.claimCampaigns)
			.where(eq(schema.claimCampaigns.creatorAddress, creator.toLowerCase()))
			.orderBy(desc(schema.claimCampaigns.createdAt));
	} catch (err) {
		console.error("[claims] getCampaignsByCreator failed:", err);
		return [];
	}
}

export interface CampaignStats {
	totalDeposited: string;
	totalClaimed: string;
	claimedCount: number;
	recipientCount: number;
	remaining: string;
}

export async function getCampaignStats(rawSlug: string): Promise<CampaignStats | null> {
	const slug = normalizeSlug(rawSlug ?? "");
	if (!isValidSlug(slug)) return null;
	try {
		const db = getDb();
		const [row] = await db
			.select({
				totalDeposited: schema.claimCampaigns.totalDeposited,
				totalClaimed: schema.claimCampaigns.totalClaimed,
				claimedCount: schema.claimCampaigns.claimedCount,
				recipientCount: schema.claimCampaigns.recipientCount,
			})
			.from(schema.claimCampaigns)
			.where(eq(schema.claimCampaigns.slug, slug))
			.limit(1);
		if (!row) return null;
		const remaining = (BigInt(row.totalDeposited) - BigInt(row.totalClaimed)).toString();
		return {
			totalDeposited: row.totalDeposited,
			totalClaimed: row.totalClaimed,
			claimedCount: row.claimedCount,
			recipientCount: row.recipientCount,
			remaining,
		};
	} catch (err) {
		console.error("[claims] getCampaignStats failed:", err);
		return null;
	}
}

// Avoid unused-import warnings while keeping the helper available for future actions.
void sql;
