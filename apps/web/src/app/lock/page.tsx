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

				<div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
					<div className="reveal">
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

					<aside
						className="reveal flex flex-col gap-6 lg:sticky lg:top-24"
						style={{ transitionDelay: "0.15s" }}
					>
						<HowItWorks tab={activeTab} />
					</aside>
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

/**
 * Context-aware How-it-works rail — content follows the active tab so the
 * right column is always relevant to what the user is doing on the left.
 * Indigo accent matches the Lock tool color across the forge.
 */
function HowItWorks({ tab }: { tab: TabKey }) {
	const copy = HOW_IT_WORKS[tab];
	return (
		<div
			className="relative overflow-hidden rounded-2xl border border-border-hair p-6"
			style={{
				background:
					"radial-gradient(circle at 50% 0%, rgba(129,140,248,0.1), transparent 60%), var(--color-bg-elevated)",
			}}
		>
			<div className="mb-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				{copy.eyebrow}
			</div>
			<div className="mb-5 font-display text-[18px] leading-[1.2] tracking-[-0.01em] text-text-primary">
				{copy.title}
			</div>
			<ol className="space-y-4 text-sm text-text-secondary">
				{copy.steps.map((step, i) => (
					<li key={`${tab}-step-${i.toString()}`} className="flex gap-3">
						<span
							className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(129,140,248,0.3)] font-mono text-[10px]"
							style={{ color: "var(--color-indigo)" }}
						>
							{i + 1}
						</span>
						<span>{step}</span>
					</li>
				))}
			</ol>
			{copy.footnote && (
				<p className="mt-5 border-border-hair/60 border-t pt-4 font-mono text-[11px] text-text-tertiary">
					{copy.footnote}
				</p>
			)}
		</div>
	);
}

const K = (text: string) => <span className="text-text-primary">{text}</span>;

const HOW_IT_WORKS: Record<
	TabKey,
	{
		eyebrow: string;
		title: string;
		steps: React.ReactNode[];
		footnote?: string;
	}
> = {
	single: {
		eyebrow: "How single-lock works",
		title: "Lock one recipient with full control",
		steps: [
			<>
				Enter the {K("token")}, {K("beneficiary")}, amount, and lock duration.
			</>,
			<>
				Optionally add a {K("cliff")} for linear vesting, or leave off for all-or-nothing unlock.
			</>,
			<>
				Approve USDC + token, then sign. Beneficiary claims over time — you can revoke if enabled.
			</>,
		],
		footnote: "Fee · 1 USDC per lock · Audited ForjaLocker contract",
	},
	batch: {
		eyebrow: "How batch-lock works",
		title: "Lock up to 50 beneficiaries in one tx",
		steps: [
			<>Paste or upload {K("address,amount")} rows for every beneficiary.</>,
			<>Set a {K("shared schedule")} — duration, cliff, vesting — applied to every row.</>,
			<>
				One USDC fee + one token approval covers the whole batch. Gas savings stack with each
				recipient.
			</>,
		],
		footnote: "ForjaLocker v2 · Flat fee, not per-beneficiary",
	},
	"my-locks": {
		eyebrow: "Locks you created",
		title: "Track and manage active locks",
		steps: [
			<>
				View every lock you forged — see {K("claimed")} vs {K("remaining")} in real time.
			</>,
			<>
				Revocable locks can be cancelled; vested portion still goes to the beneficiary, remainder
				returns to you.
			</>,
			<>Tap any row to open the on-chain transaction or jump to the token's detail page.</>,
		],
		footnote: "Progress is live; refresh after on-chain confirmations settle.",
	},
	claim: {
		eyebrow: "Locks locked to you",
		title: "Claim your vested share",
		steps: [
			<>The claimable amount updates continuously — green status means {K("ready to withdraw")}.</>,
			<>Cliff not reached? You'll see 0 claimable until the vesting starts.</>,
			<>One tap on Claim sends the currently-unlocked portion to your wallet.</>,
		],
		footnote: "Unclaimed balance continues to vest — claim anytime.",
	},
};
