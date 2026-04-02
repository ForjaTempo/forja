import type { TransactionState } from "@/components/ui/transaction-status";

/** Format a unix timestamp (seconds) to a locale date string. */
export function formatUnixDate(timestamp: number | null): string {
	if (!timestamp) return "\u2014";
	return new Date(timestamp * 1000).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/** Format a Date to a locale date string. */
export function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/** Normalize an error to a user-facing message. */
export function formatErrorMessage(error: Error | null, maxLen = 80): string {
	if (!error) return "Transaction failed";
	if (error.message?.includes("User rejected")) return "Transaction rejected by user";
	return error.message?.slice(0, maxLen) ?? "Transaction failed";
}

/** Derive the TransactionStatus state from wagmi hook flags. */
export function deriveTxState(
	isWaiting: boolean,
	isConfirming: boolean,
	isSuccess: boolean,
	error: Error | null,
): TransactionState {
	if (isWaiting) return "waiting";
	if (isConfirming) return "pending";
	if (isSuccess) return "confirmed";
	if (error) return "failed";
	return "idle";
}
