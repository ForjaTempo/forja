import type { Hex } from "viem";

export type LockSource = "v1" | "v2";

export interface LockData {
	lockId: bigint;
	source: LockSource;
	token: Hex;
	creator: Hex;
	beneficiary: Hex;
	totalAmount: bigint;
	claimedAmount: bigint;
	startTime: bigint;
	endTime: bigint;
	cliffDuration: bigint;
	vestingEnabled: boolean;
	revocable: boolean;
	revoked: boolean;
}

export type LockStatus = "locked" | "cliffing" | "vesting" | "fully-vested" | "claimed" | "revoked";

export const DURATION_PRESETS = [
	{ label: "30 Days", seconds: 30n * 86400n },
	{ label: "90 Days", seconds: 90n * 86400n },
	{ label: "180 Days", seconds: 180n * 86400n },
	{ label: "1 Year", seconds: 365n * 86400n },
] as const;

export const CLIFF_PRESETS = [
	{ label: "None", seconds: 0n },
	{ label: "7 Days", seconds: 7n * 86400n },
	{ label: "30 Days", seconds: 30n * 86400n },
	{ label: "90 Days", seconds: 90n * 86400n },
] as const;

/**
 * Mirrors contract _getVestedAmount logic exactly.
 */
function getVestedAmount(lock: LockData, now: bigint): bigint {
	if (now < lock.startTime + lock.cliffDuration) {
		return 0n;
	}

	if (!lock.vestingEnabled) {
		return now >= lock.endTime ? lock.totalAmount : 0n;
	}

	if (now >= lock.endTime) {
		return lock.totalAmount;
	}

	const elapsed = now - lock.startTime;
	const duration = lock.endTime - lock.startTime;
	return (lock.totalAmount * elapsed) / duration;
}

/**
 * Mirrors contract _getClaimableAmount logic exactly.
 */
export function getClaimableAmount(lock: LockData, now: bigint): bigint {
	if (lock.revoked) return 0n;
	const vested = getVestedAmount(lock, now);
	return vested - lock.claimedAmount;
}

/**
 * Returns vesting progress as 0-100 percentage.
 */
export function getVestingProgress(lock: LockData, now: bigint): number {
	if (lock.revoked) return 0;
	if (lock.totalAmount === 0n) return 0;
	const vested = getVestedAmount(lock, now);
	return Number((vested * 100n) / lock.totalAmount);
}

/**
 * Returns the current status of a lock.
 */
export function getLockStatus(lock: LockData, now: bigint): LockStatus {
	if (lock.revoked) return "revoked";
	if (lock.claimedAmount === lock.totalAmount) return "claimed";

	const cliffEnd = lock.startTime + lock.cliffDuration;

	if (now < cliffEnd) {
		return lock.cliffDuration > 0n ? "cliffing" : "locked";
	}

	if (!lock.vestingEnabled) {
		return now >= lock.endTime ? "fully-vested" : "locked";
	}

	return now >= lock.endTime ? "fully-vested" : "vesting";
}

/**
 * Returns human-readable time remaining until lock ends.
 */
export function getTimeRemaining(lock: LockData, now: bigint): string {
	if (now >= lock.endTime) return "Ended";
	const remaining = lock.endTime - now;
	return formatDuration(remaining);
}

/**
 * Formats a duration in seconds to a human-readable string.
 */
export function formatDuration(seconds: bigint): string {
	const s = Number(seconds);
	if (s <= 0) return "0 seconds";

	const days = Math.floor(s / 86400);
	const hours = Math.floor((s % 86400) / 3600);
	const minutes = Math.floor((s % 3600) / 60);

	if (days >= 365) {
		const years = Math.floor(days / 365);
		const remainDays = days % 365;
		return remainDays > 0 ? `${years}y ${remainDays}d` : `${years} year${years > 1 ? "s" : ""}`;
	}
	if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days} day${days > 1 ? "s" : ""}`;
	if (hours > 0)
		return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
	if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
	return `${s} second${s > 1 ? "s" : ""}`;
}
