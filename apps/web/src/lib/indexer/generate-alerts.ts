import "server-only";
import { getDb, schema } from "@forja/db";
import { and, eq, gt, gte, sql } from "drizzle-orm";
import { deleteOldAlerts } from "@/actions/alerts";

type AlertType = "holder_spike" | "large_transfer" | "unlock_soon" | "milestone" | "campaign_live";

const DEDUP_HOURS = 24;
const MILESTONES = [10, 50, 100, 500, 1000];

async function isDuplicate(
	db: ReturnType<typeof getDb>,
	walletAddress: string,
	type: AlertType,
	tokenAddress: string,
): Promise<boolean> {
	const cutoff = new Date();
	cutoff.setHours(cutoff.getHours() - DEDUP_HOURS);

	const [existing] = await db
		.select({ id: schema.alerts.id })
		.from(schema.alerts)
		.where(
			and(
				eq(schema.alerts.walletAddress, walletAddress),
				eq(schema.alerts.type, type),
				eq(schema.alerts.tokenAddress, tokenAddress),
				gte(schema.alerts.createdAt, cutoff),
			),
		)
		.limit(1);

	return !!existing;
}

async function insertAlert(
	db: ReturnType<typeof getDb>,
	walletAddress: string,
	type: AlertType,
	tokenAddress: string,
	title: string,
	message: string,
	metadata?: Record<string, unknown>,
) {
	if (await isDuplicate(db, walletAddress, type, tokenAddress)) return;

	await db.insert(schema.alerts).values({
		walletAddress,
		type,
		tokenAddress,
		title,
		message,
		metadata: metadata ? JSON.stringify(metadata) : null,
	});
}

export async function generateAlerts(): Promise<number> {
	const db = getDb();
	let alertCount = 0;

	try {
		// Get all watchlist entries grouped by token
		const watchEntries = await db
			.select({
				walletAddress: schema.watchlist.walletAddress,
				tokenAddress: schema.watchlist.tokenAddress,
			})
			.from(schema.watchlist);

		if (watchEntries.length === 0) {
			const cleaned = await deleteOldAlerts();
			if (cleaned > 0) console.log(`[alerts] Cleaned ${cleaned} old alerts`);
			return 0;
		}

		// Group by token for efficient queries
		const tokenWatchers = new Map<string, string[]>();
		for (const entry of watchEntries) {
			const watchers = tokenWatchers.get(entry.tokenAddress) ?? [];
			watchers.push(entry.walletAddress);
			tokenWatchers.set(entry.tokenAddress, watchers);
		}

		const tokenAddresses = [...tokenWatchers.keys()];

		// 1. Holder Spike — compare today vs yesterday holder count
		const now = new Date();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);

		for (const tokenAddr of tokenAddresses) {
			try {
				const stats = await db
					.select({
						date: schema.tokenDailyStats.date,
						holderCount: schema.tokenDailyStats.holderCount,
					})
					.from(schema.tokenDailyStats)
					.where(eq(schema.tokenDailyStats.tokenAddress, tokenAddr))
					.orderBy(sql`${schema.tokenDailyStats.date} DESC`)
					.limit(2);

				const todayStat = stats[0];
				const prevStat = stats[1];
				if (todayStat && prevStat) {
					if (prevStat.holderCount > 0) {
						const pctChange =
							((todayStat.holderCount - prevStat.holderCount) / prevStat.holderCount) * 100;
						if (pctChange > 10) {
							const watchers = tokenWatchers.get(tokenAddr) ?? [];
							for (const watcher of watchers) {
								await insertAlert(
									db,
									watcher,
									"holder_spike",
									tokenAddr,
									"Holder Count Spike",
									`Holder count increased ${pctChange.toFixed(0)}% (${prevStat.holderCount} → ${todayStat.holderCount})`,
									{
										previousCount: prevStat.holderCount,
										currentCount: todayStat.holderCount,
										pctChange,
									},
								);
								alertCount++;
							}
						}
					}

					// Milestone check
					for (const milestone of MILESTONES) {
						if (todayStat.holderCount >= milestone && prevStat.holderCount < milestone) {
							const watchers = tokenWatchers.get(tokenAddr) ?? [];
							for (const watcher of watchers) {
								await insertAlert(
									db,
									watcher,
									"milestone",
									tokenAddr,
									`${milestone} Holders Reached`,
									`Token now has ${todayStat.holderCount} holders`,
									{ milestone, holderCount: todayStat.holderCount },
								);
								alertCount++;
							}
						}
					}
				}
			} catch (err) {
				console.warn(`[alerts] holder spike check failed for ${tokenAddr}:`, err);
			}
		}

		// 2. Large Transfer — transfers > 5% of total supply in recent window
		for (const tokenAddr of tokenAddresses) {
			try {
				const [tokenInfo] = await db
					.select({ totalSupply: schema.tokenHubCache.totalSupply })
					.from(schema.tokenHubCache)
					.where(eq(schema.tokenHubCache.address, tokenAddr))
					.limit(1);

				if (!tokenInfo?.totalSupply) continue;

				const totalSupply = BigInt(tokenInfo.totalSupply);
				const threshold = totalSupply / 20n; // 5%

				// Check recent transfers (last hour)
				const oneHourAgo = new Date();
				oneHourAgo.setHours(oneHourAgo.getHours() - 1);

				const largeTransfers = await db
					.select({
						amount: schema.tokenTransfers.amount,
						txHash: schema.tokenTransfers.txHash,
						fromAddress: schema.tokenTransfers.fromAddress,
						toAddress: schema.tokenTransfers.toAddress,
					})
					.from(schema.tokenTransfers)
					.where(
						and(
							eq(schema.tokenTransfers.tokenAddress, tokenAddr),
							gte(schema.tokenTransfers.createdAt, oneHourAgo),
						),
					)
					.limit(10);

				for (const tx of largeTransfers) {
					if (BigInt(tx.amount) >= threshold) {
						const watchers = tokenWatchers.get(tokenAddr) ?? [];
						for (const watcher of watchers) {
							await insertAlert(
								db,
								watcher,
								"large_transfer",
								tokenAddr,
								"Large Transfer Detected",
								`Transfer of ${(Number((BigInt(tx.amount) * 10000n) / totalSupply) / 100).toFixed(1)}% of supply`,
								{ txHash: tx.txHash, amount: tx.amount },
							);
							alertCount++;
						}
					}
				}
			} catch (err) {
				console.warn(`[alerts] large transfer check failed for ${tokenAddr}:`, err);
			}
		}

		// 3. Unlock Soon — locks ending within 7 days
		const sevenDaysFromNow = new Date();
		sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

		try {
			const upcomingUnlocks = await db
				.select({
					tokenAddress: schema.locks.tokenAddress,
					endTime: schema.locks.endTime,
					totalAmount: schema.locks.totalAmount,
					beneficiaryAddress: schema.locks.beneficiaryAddress,
				})
				.from(schema.locks)
				.where(
					and(
						gt(schema.locks.endTime, now),
						sql`${schema.locks.endTime} <= ${sevenDaysFromNow.toISOString()}::timestamptz`,
						eq(schema.locks.revoked, false),
					),
				);

			for (const lock of upcomingUnlocks) {
				const watchers = tokenWatchers.get(lock.tokenAddress);
				if (!watchers) continue;

				const daysUntil = Math.ceil(
					(new Date(lock.endTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
				);

				for (const watcher of watchers) {
					await insertAlert(
						db,
						watcher,
						"unlock_soon",
						lock.tokenAddress,
						"Unlock Approaching",
						`Token lock expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
						{ endTime: lock.endTime, amount: lock.totalAmount },
					);
					alertCount++;
				}
			}
		} catch (err) {
			console.warn("[alerts] unlock soon check failed:", err);
		}

		// 4. Campaign Live — claim campaigns that recently started
		try {
			const oneHourAgo = new Date();
			oneHourAgo.setHours(oneHourAgo.getHours() - 1);

			const liveCampaigns = await db
				.select({
					tokenAddress: schema.claimCampaigns.tokenAddress,
					title: schema.claimCampaigns.title,
					slug: schema.claimCampaigns.slug,
				})
				.from(schema.claimCampaigns)
				.where(
					and(
						gte(schema.claimCampaigns.startTime, oneHourAgo),
						sql`${schema.claimCampaigns.startTime} <= ${now.toISOString()}::timestamptz`,
					),
				);

			for (const campaign of liveCampaigns) {
				const watchers = tokenWatchers.get(campaign.tokenAddress);
				if (!watchers) continue;

				for (const watcher of watchers) {
					await insertAlert(
						db,
						watcher,
						"campaign_live",
						campaign.tokenAddress,
						"Claim Campaign Live",
						`"${campaign.title}" is now open for claiming`,
						{ slug: campaign.slug },
					);
					alertCount++;
				}
			}
		} catch (err) {
			console.warn("[alerts] campaign live check failed:", err);
		}

		// Cleanup old alerts
		const cleaned = await deleteOldAlerts();
		if (cleaned > 0) console.log(`[alerts] Cleaned ${cleaned} old alerts`);

		if (alertCount > 0) {
			console.log(`[alerts] Generated ${alertCount} alerts`);
		}

		return alertCount;
	} catch (err) {
		console.error("[alerts] generateAlerts failed:", err);
		return 0;
	}
}
