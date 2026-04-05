"use server";
import { getDb, schema } from "@forja/db";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { isAddress } from "viem";

type SortOption = "newest" | "oldest" | "holders" | "transfers";

interface TokenListParams {
	search?: string;
	sort?: SortOption;
	forjaOnly?: boolean;
	offset?: number;
	limit?: number;
}

export async function getTokenList({
	search,
	sort = "newest",
	forjaOnly,
	offset = 0,
	limit = 20,
}: TokenListParams = {}) {
	try {
		const db = getDb();
		const conditions = [];

		if (forjaOnly) {
			conditions.push(eq(schema.tokenHubCache.isForjaCreated, true));
		}

		if (search?.trim()) {
			const term = `%${search.trim()}%`;
			const searchCondition = isAddress(search.trim())
				? eq(schema.tokenHubCache.address, search.trim().toLowerCase())
				: or(ilike(schema.tokenHubCache.name, term), ilike(schema.tokenHubCache.symbol, term));
			if (searchCondition) conditions.push(searchCondition);
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const orderBy = (() => {
			switch (sort) {
				case "holders":
					return desc(schema.tokenHubCache.holderCount);
				case "transfers":
					return desc(schema.tokenHubCache.transferCount);
				case "oldest":
					return asc(schema.tokenHubCache.createdAt);
				default:
					return desc(schema.tokenHubCache.createdAt);
			}
		})();

		const [tokens, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.tokenHubCache)
				.where(where)
				.orderBy(orderBy)
				.offset(offset)
				.limit(limit),
			db.select({ value: count() }).from(schema.tokenHubCache).where(where),
		]);

		return { tokens, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[actions] getTokenList failed:", err);
		return { tokens: [], total: 0 };
	}
}

export async function getTokenHubStats() {
	try {
		const db = getDb();
		const [[totalResult], [forjaResult], [holderResult]] = await Promise.all([
			db.select({ value: count() }).from(schema.tokenHubCache),
			db
				.select({ value: count() })
				.from(schema.tokenHubCache)
				.where(eq(schema.tokenHubCache.isForjaCreated, true)),
			db
				.select({ value: sql<number>`COALESCE(SUM(${schema.tokenHubCache.holderCount}), 0)` })
				.from(schema.tokenHubCache),
		]);

		return {
			totalTokens: totalResult?.value ?? 0,
			forjaTokens: forjaResult?.value ?? 0,
			totalHolders: Number(holderResult?.value ?? 0),
		};
	} catch (err) {
		console.error("[actions] getTokenHubStats failed:", err);
		return { totalTokens: 0, forjaTokens: 0, totalHolders: 0 };
	}
}

export async function getTokenDetail(address: string) {
	if (!address) return null;

	try {
		const db = getDb();
		const [token] = await db
			.select()
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.address, address.toLowerCase()))
			.limit(1);

		return token ?? null;
	} catch (err) {
		console.error("[actions] getTokenDetail failed:", err);
		return null;
	}
}

export async function getTokenTransfers(address: string, { offset = 0, limit = 10 } = {}) {
	if (!address) return { transfers: [], total: 0 };

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const [transfers, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.tokenTransfers)
				.where(eq(schema.tokenTransfers.tokenAddress, addr))
				.orderBy(desc(schema.tokenTransfers.blockNumber), desc(schema.tokenTransfers.logIndex))
				.offset(offset)
				.limit(limit),
			db
				.select({ value: count() })
				.from(schema.tokenTransfers)
				.where(eq(schema.tokenTransfers.tokenAddress, addr)),
		]);

		return { transfers, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[actions] getTokenTransfers failed:", err);
		return { transfers: [], total: 0 };
	}
}

export async function getTokenHolderDistribution(address: string) {
	if (!address) return [];

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		// Get total supply from cache
		const [token] = await db
			.select({ totalSupply: schema.tokenHubCache.totalSupply })
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.address, addr))
			.limit(1);

		const totalSupply = token?.totalSupply ? BigInt(token.totalSupply) : 0n;

		// Get top 10 holders
		const holders = await db
			.select({
				holderAddress: schema.tokenHolderBalances.holderAddress,
				balance: schema.tokenHolderBalances.balance,
			})
			.from(schema.tokenHolderBalances)
			.where(eq(schema.tokenHolderBalances.tokenAddress, addr))
			.orderBy(desc(sql`CAST(${schema.tokenHolderBalances.balance} AS NUMERIC)`))
			.limit(10);

		return holders.map((h) => {
			const balance = BigInt(h.balance);
			const percentage = totalSupply > 0n ? Number((balance * 10000n) / totalSupply) / 100 : 0;
			return {
				holderAddress: h.holderAddress,
				balance: h.balance,
				percentage,
			};
		});
	} catch (err) {
		console.error("[actions] getTokenHolderDistribution failed:", err);
		return [];
	}
}

export async function getCreatorProfile(address: string) {
	if (!isAddress(address)) return null;

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const [
			[tokenResult],
			[multisendResult],
			[lockResult],
			[recipientResult],
			[firstSeenResult],
			[tvlResult],
		] = await Promise.all([
			db
				.select({ value: count() })
				.from(schema.tokens)
				.where(eq(schema.tokens.creatorAddress, addr)),
			db
				.select({ value: count() })
				.from(schema.multisends)
				.where(eq(schema.multisends.senderAddress, addr)),
			db.select({ value: count() }).from(schema.locks).where(eq(schema.locks.creatorAddress, addr)),
			db
				.select({ value: sql<number>`COALESCE(SUM(${schema.multisends.recipientCount}), 0)` })
				.from(schema.multisends)
				.where(eq(schema.multisends.senderAddress, addr)),
			db
				.select({ value: sql<Date>`MIN(${schema.tokens.createdAt})` })
				.from(schema.tokens)
				.where(eq(schema.tokens.creatorAddress, addr)),
			db
				.select({
					value: sql<string>`COALESCE(SUM(CAST(${schema.locks.totalAmount} AS NUMERIC) - CAST(${schema.locks.claimedAmount} AS NUMERIC)), 0)`,
				})
				.from(schema.locks)
				.where(eq(schema.locks.creatorAddress, addr)),
		]);

		const tokensCreated = tokenResult?.value ?? 0;
		if (tokensCreated === 0) return null;

		return {
			address: addr,
			tokensCreated,
			multisendCount: multisendResult?.value ?? 0,
			lockCount: lockResult?.value ?? 0,
			totalRecipients: Number(recipientResult?.value ?? 0),
			totalValueLocked: tvlResult?.value ?? "0",
			firstSeen: firstSeenResult?.value ?? null,
		};
	} catch (err) {
		console.error("[actions] getCreatorProfile failed:", err);
		return null;
	}
}

export async function getCreatorTokens(address: string) {
	if (!isAddress(address)) return [];

	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.tokenHubCache)
			.where(eq(schema.tokenHubCache.creatorAddress, address.toLowerCase()))
			.orderBy(desc(schema.tokenHubCache.createdAt));
	} catch (err) {
		console.error("[actions] getCreatorTokens failed:", err);
		return [];
	}
}

export async function getCreatorMultisends(address: string) {
	if (!isAddress(address)) return [];

	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.multisends)
			.where(eq(schema.multisends.senderAddress, address.toLowerCase()))
			.orderBy(desc(schema.multisends.blockNumber));
	} catch (err) {
		console.error("[actions] getCreatorMultisends failed:", err);
		return [];
	}
}

export async function getCreatorLocks(address: string) {
	if (!isAddress(address)) return [];

	try {
		const db = getDb();
		return await db
			.select()
			.from(schema.locks)
			.where(eq(schema.locks.creatorAddress, address.toLowerCase()))
			.orderBy(desc(schema.locks.blockNumber));
	} catch (err) {
		console.error("[actions] getCreatorLocks failed:", err);
		return [];
	}
}
