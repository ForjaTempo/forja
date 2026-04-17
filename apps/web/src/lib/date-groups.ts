const DAY_MS = 24 * 60 * 60 * 1000;

export type DateGroupKey = "today" | "yesterday" | "thisWeek" | "older";

export const DATE_GROUP_LABELS: Record<DateGroupKey, string> = {
	today: "Today",
	yesterday: "Yesterday",
	thisWeek: "This Week",
	older: "Older",
};

/**
 * Group items with a `createdAt` timestamp into Today / Yesterday / This Week / Older.
 * Boundaries use local midnight (browser timezone) — keeps UX intuitive when a user
 * checks the app near midnight.
 */
export function groupByDate<T extends { createdAt: Date | string }>(
	items: T[],
): Record<DateGroupKey, T[]> {
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const startOfYesterday = startOfToday - DAY_MS;
	const startOfWeek = startOfToday - 7 * DAY_MS;

	const groups: Record<DateGroupKey, T[]> = {
		today: [],
		yesterday: [],
		thisWeek: [],
		older: [],
	};

	for (const item of items) {
		const ts = new Date(item.createdAt).getTime();
		if (ts >= startOfToday) groups.today.push(item);
		else if (ts >= startOfYesterday) groups.yesterday.push(item);
		else if (ts >= startOfWeek) groups.thisWeek.push(item);
		else groups.older.push(item);
	}

	return groups;
}

export const DATE_GROUP_ORDER: DateGroupKey[] = ["today", "yesterday", "thisWeek", "older"];
