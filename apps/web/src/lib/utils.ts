import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Truncate a 0x… address into a short `0x1234…abcd` form. Used across
 * launch cards, trade feeds, history tables, account pills — anywhere a
 * full 42-char address would dominate the row.
 *
 * Uses an ellipsis (…) rather than triple-dot so it reads cleanly in the
 * forge-editorial typographic scale.
 */
export function truncateAddress(address: string, start = 6, end = 4): string {
	if (!address) return "";
	if (address.length <= start + end + 1) return address;
	return `${address.slice(0, start)}…${address.slice(-end)}`;
}
