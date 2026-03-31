"use client";

import { formatUnits } from "viem";
import { useNow } from "@/hooks/use-now";
import { useTokenInfo } from "@/hooks/use-token-info";
import { TIP20_DECIMALS } from "@/lib/constants";
import type { LockData } from "@/lib/lock-utils";
import {
	getClaimableAmount,
	getLockStatus,
	getTimeRemaining,
	getVestingProgress,
} from "@/lib/lock-utils";
import { LockStatusBadge } from "./lock-status-badge";

interface LockCardProps {
	lock: LockData;
	role: "creator" | "beneficiary";
	onClaim?: (lockId: bigint) => void;
	onRevoke?: (lockId: bigint) => void;
	isActionPending?: boolean;
}

export function LockCard({ lock, role, onClaim, onRevoke, isActionPending }: LockCardProps) {
	const now = useNow();
	const { name: tokenName, symbol: tokenSymbol } = useTokenInfo(lock.token);

	const status = getLockStatus(lock, now);
	const progress = getVestingProgress(lock, now);
	const claimable = getClaimableAmount(lock, now);
	const timeRemaining = getTimeRemaining(lock, now);

	const totalFormatted = formatUnits(lock.totalAmount, TIP20_DECIMALS);
	const claimedFormatted = formatUnits(lock.claimedAmount, TIP20_DECIMALS);
	const claimableFormatted = formatUnits(claimable, TIP20_DECIMALS);
	const symbol = tokenSymbol ?? "tokens";

	const canClaim = role === "beneficiary" && claimable > 0n && !lock.revoked;
	const canRevoke =
		role === "creator" && lock.revocable && !lock.revoked && lock.claimedAmount < lock.totalAmount;

	return (
		<div className="space-y-4 rounded-lg border border-anvil-gray-light bg-deep-charcoal p-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-medium text-smoke">{tokenName ?? "Token"}</span>
					{tokenSymbol && (
						<span className="rounded bg-anvil-gray px-1.5 py-0.5 font-mono text-xs text-smoke-dark">
							{tokenSymbol}
						</span>
					)}
				</div>
				<LockStatusBadge status={status} />
			</div>

			{/* Details */}
			<div className="space-y-2 text-sm">
				<div className="flex items-center justify-between">
					<span className="text-smoke-dark">Lock ID</span>
					<span className="font-mono text-smoke">#{lock.lockId.toString()}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-smoke-dark">Total</span>
					<span className="font-mono text-smoke">
						{Number.parseFloat(totalFormatted).toLocaleString("en-US", {
							maximumFractionDigits: 2,
						})}{" "}
						{symbol}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-smoke-dark">Claimed</span>
					<span className="font-mono text-smoke">
						{Number.parseFloat(claimedFormatted).toLocaleString("en-US", {
							maximumFractionDigits: 2,
						})}{" "}
						{symbol}
					</span>
				</div>
				{role === "creator" && (
					<div className="flex items-center justify-between">
						<span className="text-smoke-dark">Beneficiary</span>
						<span className="font-mono text-xs text-smoke">
							{`${lock.beneficiary.slice(0, 8)}...${lock.beneficiary.slice(-6)}`}
						</span>
					</div>
				)}
				{role === "beneficiary" && (
					<div className="flex items-center justify-between">
						<span className="text-smoke-dark">Creator</span>
						<span className="font-mono text-xs text-smoke">
							{`${lock.creator.slice(0, 8)}...${lock.creator.slice(-6)}`}
						</span>
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className="text-smoke-dark">Time remaining</span>
					<span className="text-smoke">{timeRemaining}</span>
				</div>
			</div>

			{/* Progress bar */}
			{!lock.revoked && (
				<div className="space-y-1">
					<div className="flex items-center justify-between text-xs">
						<span className="text-smoke-dark">
							{lock.vestingEnabled ? "Vesting progress" : "Unlock progress"}
						</span>
						<span className="text-smoke">{progress}%</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-anvil-gray">
						<div
							className="h-full rounded-full bg-molten-amber transition-all duration-500"
							style={{ width: `${Math.min(progress, 100)}%` }}
						/>
					</div>
				</div>
			)}

			{/* Actions */}
			{(canClaim || canRevoke) && (
				<div className="flex gap-2 pt-1">
					{canClaim && (
						<button
							type="button"
							onClick={() => onClaim?.(lock.lockId)}
							disabled={isActionPending}
							className="flex-1 rounded-md bg-molten-amber px-3 py-2 text-sm font-medium text-obsidian-black transition-colors hover:bg-molten-amber/90 disabled:opacity-50"
						>
							Claim{" "}
							{Number.parseFloat(claimableFormatted).toLocaleString("en-US", {
								maximumFractionDigits: 2,
							})}{" "}
							{symbol}
						</button>
					)}
					{canRevoke && (
						<button
							type="button"
							onClick={() => onRevoke?.(lock.lockId)}
							disabled={isActionPending}
							className="flex-1 rounded-md border border-ember-red/50 px-3 py-2 text-sm font-medium text-ember-red transition-colors hover:bg-ember-red/10 disabled:opacity-50"
						>
							Revoke
						</button>
					)}
				</div>
			)}
		</div>
	);
}
