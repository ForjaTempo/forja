"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BatchLockForm } from "@/components/lock/batch-lock-form";
import { BatchLockSuccessModal } from "@/components/lock/batch-success-modal";
import { LockForm } from "@/components/lock/lock-form";
import { LocksList } from "@/components/lock/locks-list";
import { LockSuccessModal } from "@/components/lock/success-modal";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero, ToolStat, ToolStatBar, ToolStatDivider } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useUserLocks } from "@/hooks/use-user-locks";
import { hasLockerV2 } from "@/lib/contracts";
import { getClaimableAmount } from "@/lib/lock-utils";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

interface LockSuccess {
	lockId: bigint;
	tokenSymbol: string;
	amount: string;
	beneficiary: string;
	txHash: string;
	endTime: Date;
}

interface BatchLockSuccess {
	lockIds: bigint[];
	tokenSymbol: string;
	totalAmount: string;
	count: number;
	txHash: string;
	durationDays: number;
}

type TabKey = "single" | "batch" | "my-locks" | "claim";

interface TabDef {
	key: TabKey;
	label: string;
}

export default function LockPage() {
	useReveal();
	const searchParams = useSearchParams();
	const initialToken = searchParams.get("token") ?? "";

	const [activeTab, setActiveTab] = useState<TabKey>("single");
	const [successData, setSuccessData] = useState<LockSuccess | null>(null);
	const [batchSuccessData, setBatchSuccessData] = useState<BatchLockSuccess | null>(null);
	const [formKey, setFormKey] = useState(0);
	const { txConfirmed } = useTransactionToast();
	const addTransaction = useAppStore((s) => s.addTransaction);
	const { createdLocks, beneficiaryLocks, isLoading, refetch } = useUserLocks();

	const claimableCount = useMemo(() => {
		const now = BigInt(Math.floor(Date.now() / 1000));
		return beneficiaryLocks.reduce((acc, lock) => {
			return getClaimableAmount(lock, now) > 0n ? acc + 1 : acc;
		}, 0);
	}, [beneficiaryLocks]);

	const handleSuccess = useCallback(
		(data: LockSuccess) => {
			setSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "lock",
				description: `Locked ${data.amount} ${data.tokenSymbol}`,
				timestamp: Date.now(),
			});
			refetch();
		},
		[txConfirmed, addTransaction, refetch],
	);

	const handleBatchSuccess = useCallback(
		(data: BatchLockSuccess) => {
			setBatchSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "lock",
				description: `Batch locked ${data.totalAmount} ${data.tokenSymbol} for ${data.count} beneficiaries`,
				timestamp: Date.now(),
			});
			refetch();
		},
		[txConfirmed, addTransaction, refetch],
	);

	const handleCreateAnother = useCallback(() => {
		setSuccessData(null);
		setBatchSuccessData(null);
		setFormKey((k) => k + 1);
	}, []);

	const handleViewLocks = useCallback(() => {
		setSuccessData(null);
		setBatchSuccessData(null);
		setActiveTab("my-locks");
	}, []);

	const handleActionComplete = useCallback(() => {
		refetch();
	}, [refetch]);

	const tabs: TabDef[] = [
		{ key: "single", label: "Single Lock" },
		...(hasLockerV2 ? [{ key: "batch" as const, label: "Batch Lock" }] : []),
		{ key: "my-locks", label: "My Locks" },
		{ key: "claim", label: "Claim" },
	];

	return (
		<div className="noise relative min-h-screen overflow-hidden bg-bg-page">
			<CursorGlow color="rgba(129,140,248,0.06)" size={520} />

			<div className="pointer-events-none absolute inset-0 z-0">
				<div
					className="absolute top-[5%] left-[-15%] h-[700px] w-[700px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(129,140,248,0.10) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
				<div
					className="absolute bottom-[15%] right-[-10%] h-[500px] w-[500px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(240,211,138,0.05) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
			</div>

			<main className="relative z-[5] mx-auto max-w-[1400px] px-6 pt-16 pb-20 sm:px-10 sm:pt-20 sm:pb-24">
				<ToolHero
					number="/03"
					label="Lock · Vesting with teeth"
					accent="indigo"
					title={
						<span>
							Trust,{" "}
							<span className="italic" style={{ color: "var(--color-indigo)" }}>
								encoded.
							</span>
						</span>
					}
					description="Lock tokens with cliffs, linear vesting, and optional revocation. Build trust with your community by locking liquidity, team allocations, and investor shares — settled on-chain."
					aside={
						claimableCount > 0 ? (
							<ToolStatBar>
								<ToolStat
									label="Claimable today"
									value={claimableCount}
									unit={claimableCount === 1 ? "lock" : "locks"}
									accent="green"
								/>
								<ToolStatDivider />
								<ToolStat
									label="Your locks"
									value={createdLocks.length}
									unit="active"
									accent="indigo"
								/>
							</ToolStatBar>
						) : (
							<ToolStatBar>
								<ToolStat
									label="Your locks"
									value={createdLocks.length}
									unit="active"
									accent="indigo"
								/>
								<ToolStatDivider />
								<ToolStat
									label="Beneficiary"
									value={beneficiaryLocks.length}
									unit="locks"
									accent="gold"
								/>
							</ToolStatBar>
						)
					}
					className="mb-12"
				/>

				{/* Pill-group tabs */}
				<div
					className="reveal mb-10 flex w-fit flex-wrap gap-1.5 rounded-xl border border-border-hair bg-bg-elevated p-1"
					role="tablist"
					aria-label="Lock tool tabs"
				>
					{tabs.map((t) => {
						const active = activeTab === t.key;
						return (
							<button
								key={t.key}
								type="button"
								role="tab"
								aria-selected={active}
								onClick={() => setActiveTab(t.key)}
								className={cn(
									"rounded-lg px-4 py-2 text-sm font-medium transition-colors",
									active
										? "bg-bg-card text-text-primary"
										: "text-text-secondary hover:text-text-primary",
								)}
							>
								{t.label}
							</button>
						);
					})}
				</div>

				<div className="reveal mx-auto max-w-2xl">
					{activeTab === "single" && (
						<LockForm
							key={`single-${formKey}`}
							onSuccess={handleSuccess}
							initialToken={initialToken}
						/>
					)}
					{activeTab === "batch" && hasLockerV2 && (
						<BatchLockForm
							key={`batch-${formKey}`}
							onSuccess={handleBatchSuccess}
							initialToken={initialToken}
						/>
					)}
					{activeTab === "my-locks" && (
						<LocksList
							locks={createdLocks}
							viewRole="creator"
							isLoading={isLoading}
							onActionComplete={handleActionComplete}
						/>
					)}
					{activeTab === "claim" && (
						<LocksList
							locks={beneficiaryLocks}
							viewRole="beneficiary"
							isLoading={isLoading}
							onActionComplete={handleActionComplete}
						/>
					)}
				</div>
			</main>

			{successData && (
				<LockSuccessModal
					open={!!successData}
					onOpenChange={(open) => {
						if (!open) setSuccessData(null);
					}}
					lockId={successData.lockId}
					tokenSymbol={successData.tokenSymbol}
					amount={successData.amount}
					beneficiary={successData.beneficiary}
					txHash={successData.txHash}
					endTime={successData.endTime}
					onCreateAnother={handleCreateAnother}
					onViewLocks={handleViewLocks}
				/>
			)}

			{batchSuccessData && (
				<BatchLockSuccessModal
					open={!!batchSuccessData}
					onOpenChange={(open) => {
						if (!open) setBatchSuccessData(null);
					}}
					lockIds={batchSuccessData.lockIds}
					tokenSymbol={batchSuccessData.tokenSymbol}
					totalAmount={batchSuccessData.totalAmount}
					count={batchSuccessData.count}
					txHash={batchSuccessData.txHash}
					durationDays={batchSuccessData.durationDays}
					onCreateAnother={handleCreateAnother}
					onViewLocks={handleViewLocks}
				/>
			)}
		</div>
	);
}
