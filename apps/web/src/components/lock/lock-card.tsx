"use client";

import { formatUnits } from "viem";
import { useNow } from "@/hooks/use-now";
import { useTokenInfo } from "@/hooks/use-token-info";
import { TIP20_DECIMALS } from "@/lib/constants";
import type { LockData, LockSource } from "@/lib/lock-utils";
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
	onClaim?: (lockId: bigint, source: LockSource) => void;
	onRevoke?: (lockId: bigint, source: LockSource) => void;
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
		<div className="space-y-4 rounded-2xl border border-border-hair bg-bg-elevated p-5 transition-colors hover:border-border-subtle">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-display text-[17px] tracking-[-0.01em] text-text-primary">
						{tokenName ?? "Token"}
					</span>
					{tokenSymbol && (
						<span className="rounded bg-bg-field px-1.5 py-0.5 font-mono text-[10px] text-gold uppercase tracking-[0.1em]">
							{tokenSymbol}
						</span>
					)}
				</div>
				<LockStatusBadge status={status} />
			</div>

			<div className="space-y-2 text-[13px]">
				<div className="flex items-center justify-between">
					<span className="text-text-tertiary">Lock ID</span>
					<span className="font-mono text-text-secondary">#{lock.lockId.toString()}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-text-tertiary">Total</span>
					<span className="font-mono text-text-primary">
						{Number.parseFloat(totalFormatted).toLocaleString("en-US", {
							maximumFractionDigits: 2,
						})}{" "}
						{symbol}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-text-tertiary">Claimed</span>
					<span className="font-mono text-text-secondary">
						{Number.parseFloat(claimedFormatted).toLocaleString("en-US", {
							maximumFractionDigits: 2,
						})}{" "}
						{symbol}
					</span>
				</div>
				{role === "creator" && (
					<div className="flex items-center justify-between">
						<span className="text-text-tertiary">Beneficiary</span>
						<span className="font-mono text-[12px] text-text-secondary">
							{`${lock.beneficiary.slice(0, 8)}…${lock.beneficiary.slice(-6)}`}
						</span>
					</div>
				)}
				{role === "beneficiary" && (
					<div className="flex items-center justify-between">
						<span className="text-text-tertiary">Creator</span>
						<span className="font-mono text-[12px] text-text-secondary">
							{`${lock.creator.slice(0, 8)}…${lock.creator.slice(-6)}`}
						</span>
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className="text-text-tertiary">Time remaining</span>
					<span className="text-text-secondary">{timeRemaining}</span>
				</div>
			</div>

			{!lock.revoked && (
				<div className="space-y-1.5">
					<div className="flex items-center justify-between font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
						<span>{lock.vestingEnabled ? "Vesting progress" : "Unlock progress"}</span>
						<span className="text-text-secondary">{progress}%</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-bg-field">
						<div
							className="h-full rounded-full transition-all duration-500"
							style={{
								width: `${Math.min(progress, 100)}%`,
								background: "linear-gradient(90deg, rgba(129,140,248,0.9), rgba(129,140,248,0.5))",
							}}
						/>
					</div>
				</div>
			)}

			{(canClaim || canRevoke) && (
				<div className="flex gap-2 pt-1">
					{canClaim && (
						<button
							type="button"
							onClick={() => onClaim?.(lock.lockId, lock.source)}
							disabled={isActionPending}
							className="inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
							style={{
								background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
								boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
							}}
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
							onClick={() => onRevoke?.(lock.lockId, lock.source)}
							disabled={isActionPending}
							className="flex-1 rounded-xl border border-red/40 bg-transparent px-3 py-2.5 font-medium text-[13px] text-red transition-colors hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Revoke
						</button>
					)}
				</div>
			)}
		</div>
	);
}
