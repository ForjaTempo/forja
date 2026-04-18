"use client";

import { LoaderIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaim, useRevokeLock } from "@/hooks/use-lock-actions";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import type { LockData, LockSource } from "@/lib/lock-utils";
import { LockCard } from "./lock-card";

interface LocksListProps {
	locks: LockData[];
	viewRole: "creator" | "beneficiary";
	isLoading: boolean;
	onActionComplete?: () => void;
}

export function LocksList({ locks, viewRole, isLoading, onActionComplete }: LocksListProps) {
	const [revokeTarget, setRevokeTarget] = useState<{ lockId: bigint; source: LockSource } | null>(
		null,
	);

	const claim = useClaim();
	const revoke = useRevokeLock();

	const handleClaim = useCallback(
		(lockId: bigint, source: LockSource) => {
			claim.reset();
			claim.execute(lockId, source);
		},
		[claim],
	);

	const handleRevokeConfirm = useCallback(() => {
		if (revokeTarget === null) return;
		revoke.reset();
		revoke.execute(revokeTarget.lockId, revokeTarget.source);
		setRevokeTarget(null);
	}, [revokeTarget, revoke]);

	useTransactionEffects({
		txHash: claim.txHash,
		isConfirming: claim.isConfirming,
		isSuccess: claim.isSuccess,
		error: claim.error,
		showConfirmedToast: true,
		onSuccess: () => onActionComplete?.(),
	});

	useTransactionEffects({
		txHash: revoke.txHash,
		isConfirming: revoke.isConfirming,
		isSuccess: revoke.isSuccess,
		error: revoke.error,
		showConfirmedToast: true,
		onSuccess: () => onActionComplete?.(),
	});

	const isActionPending =
		claim.isPending || claim.isConfirming || revoke.isPending || revoke.isConfirming;

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-48 w-full rounded-2xl" />
				<Skeleton className="h-48 w-full rounded-2xl" />
			</div>
		);
	}

	if (locks.length === 0) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-10 text-center">
				<p className="text-[13px] text-text-tertiary">
					{viewRole === "creator"
						? "You haven't forged any locks yet."
						: "No tokens locked for you."}
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{locks.map((lock) => (
					<LockCard
						key={`${lock.source}-${lock.lockId.toString()}`}
						lock={lock}
						role={viewRole}
						onClaim={handleClaim}
						onRevoke={(id, source) => setRevokeTarget({ lockId: id, source })}
						isActionPending={isActionPending}
					/>
				))}
			</div>

			<Dialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
				<DialogContent className="border-border-subtle bg-bg-elevated sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="font-display text-[22px] tracking-[-0.01em]">
							Revoke lock?
						</DialogTitle>
						<DialogDescription className="text-[13px] text-text-secondary">
							Unclaimed vested tokens go to the beneficiary, unvested tokens return to you. This
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 flex gap-3">
						<button
							type="button"
							onClick={() => setRevokeTarget(null)}
							className="flex-1 rounded-xl border border-border-hair bg-bg-elevated px-4 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleRevokeConfirm}
							disabled={revoke.isPending || revoke.isConfirming}
							className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red/40 bg-red/10 px-4 py-3 font-semibold text-[13px] text-red transition-colors hover:bg-red/20 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{(revoke.isPending || revoke.isConfirming) && (
								<LoaderIcon className="size-4 animate-spin" />
							)}
							Revoke
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
