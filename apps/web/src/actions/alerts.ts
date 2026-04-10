"use server";
import { getDb, schema } from "@forja/db";
import { and, count, desc, eq, lt } from "drizzle-orm";
import { isAddress } from "viem";

const ALERT_TTL_DAYS = 30;

export async function getAlerts(
	address: string,
	{ limit = 20, offset = 0, unreadOnly = false } = {},
) {
	if (!isAddress(address)) return { alerts: [], total: 0 };

	try {
		const db = getDb();
		const addr = address.toLowerCase();

		const conditions = [eq(schema.alerts.walletAddress, addr)];
		if (unreadOnly) {
			conditions.push(eq(schema.alerts.isRead, false));
		}

		const where = and(...conditions);

		const [alerts, [totalResult]] = await Promise.all([
			db
				.select()
				.from(schema.alerts)
				.where(where)
				.orderBy(desc(schema.alerts.createdAt))
				.offset(offset)
				.limit(limit),
			db.select({ value: count() }).from(schema.alerts).where(where),
		]);

		return { alerts, total: totalResult?.value ?? 0 };
	} catch (err) {
		console.error("[actions] getAlerts failed:", err);
		return { alerts: [], total: 0 };
	}
}

export async function getUnreadAlertCount(address: string): Promise<number> {
	if (!isAddress(address)) return 0;

	try {
		const db = getDb();
		const [result] = await db
			.select({ value: count() })
			.from(schema.alerts)
			.where(
				and(
					eq(schema.alerts.walletAddress, address.toLowerCase()),
					eq(schema.alerts.isRead, false),
				),
			);

		return result?.value ?? 0;
	} catch (err) {
		console.error("[actions] getUnreadAlertCount failed:", err);
		return 0;
	}
}

export async function markAlertAsRead(alertId: number, address: string): Promise<{ ok: boolean }> {
	if (!isAddress(address)) return { ok: false };

	try {
		const db = getDb();
		await db
			.update(schema.alerts)
			.set({ isRead: true })
			.where(
				and(eq(schema.alerts.id, alertId), eq(schema.alerts.walletAddress, address.toLowerCase())),
			);

		return { ok: true };
	} catch (err) {
		console.error("[actions] markAlertAsRead failed:", err);
		return { ok: false };
	}
}

export async function markAllAlertsAsRead(address: string): Promise<{ ok: boolean }> {
	if (!isAddress(address)) return { ok: false };

	try {
		const db = getDb();
		await db
			.update(schema.alerts)
			.set({ isRead: true })
			.where(
				and(
					eq(schema.alerts.walletAddress, address.toLowerCase()),
					eq(schema.alerts.isRead, false),
				),
			);

		return { ok: true };
	} catch (err) {
		console.error("[actions] markAllAlertsAsRead failed:", err);
		return { ok: false };
	}
}

export async function deleteOldAlerts(): Promise<number> {
	try {
		const db = getDb();
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - ALERT_TTL_DAYS);

		const result = await db
			.delete(schema.alerts)
			.where(lt(schema.alerts.createdAt, cutoff))
			.returning({ id: schema.alerts.id });

		return result.length;
	} catch (err) {
		console.error("[actions] deleteOldAlerts failed:", err);
		return 0;
	}
}
