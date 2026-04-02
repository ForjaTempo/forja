"use client";

import { LoaderIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useClaim, useRevokeLock } from "@/hooks/use-lock-actions";
import { useTransactionEffects } from "@/hooks/use-transaction-effects";
import type { LockData } from "@/lib/lock-utils";
import { LockCard } from "./lock-card";

interface LocksListProps {
	locks: LockData[];
	viewRole: "creator" | "beneficiary";
	isLoading: boolean;
	onActionComplete?: () => void;
}

export function LocksList({ locks, viewRole, isLoading, onActionComplete }: LocksListProps) {
	const [revokeTarget, setRevokeTarget] = useState<bigint | null>(null);

	const claim = useClaim();
	const revoke = useRevokeLock();

	const handleClaim = useCallback(
		(lockId: bigint) => {
			claim.reset();
			claim.execute(lockId);
		},
		[claim],
	);

	const handleRevokeConfirm = useCallback(() => {
		if (revokeTarget === null) return;
		revoke.reset();
		revoke.execute(revokeTarget);
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
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	if (locks.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 py-12 text-center">
				<p className="text-sm text-smoke-dark">
					{viewRole === "creator"
						? "You haven't created any locks yet."
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
						key={lock.lockId.toString()}
						lock={lock}
						role={viewRole}
						onClaim={handleClaim}
						onRevoke={(id) => setRevokeTarget(id)}
						isActionPending={isActionPending}
					/>
				))}
			</div>

			{/* Revoke confirmation dialog */}
			<Dialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Revoke Lock</DialogTitle>
						<DialogDescription>
							Are you sure? Unclaimed vested tokens will be sent to the beneficiary, and unvested
							tokens will be returned to you.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							variant="destructive"
							className="w-full"
							onClick={handleRevokeConfirm}
							disabled={revoke.isPending || revoke.isConfirming}
						>
							{(revoke.isPending || revoke.isConfirming) && (
								<LoaderIcon className="size-4 animate-spin" />
							)}
							Revoke Lock
						</Button>
						<Button variant="secondary" className="w-full" onClick={() => setRevokeTarget(null)}>
							Cancel
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
