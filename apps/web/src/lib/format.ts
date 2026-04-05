import { formatUnits } from "viem";
import type { TransactionState } from "@/components/ui/transaction-status";
import { TIP20_DECIMALS } from "@/lib/constants";

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

/** Format a raw token supply (bigint) to a human-readable string. */
export function formatSupply(raw: bigint): string {
	const str = formatUnits(raw, TIP20_DECIMALS);
	const dotIdx = str.indexOf(".");
	const intPart = dotIdx === -1 ? str : str.slice(0, dotIdx);
	const decPart = dotIdx === -1 ? "" : str.slice(dotIdx + 1);
	const n = BigInt(intPart);

	if (n >= 1_000_000_000n) {
		const whole = n / 1_000_000_000n;
		const frac = (n % 1_000_000_000n) / 100_000_000n;
		return `${whole}.${frac}B`;
	}
	if (n >= 1_000_000n) {
		const whole = n / 1_000_000n;
		const frac = (n % 1_000_000n) / 100_000n;
		return `${whole}.${frac}M`;
	}
	if (n >= 1_000n) {
		const whole = n / 1_000n;
		const frac = (n % 1_000n) / 100n;
		return `${whole}.${frac}K`;
	}

	if (decPart && decPart !== "0") {
		return `${intPart}.${decPart.slice(0, 2)}`;
	}
	return intPart;
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
