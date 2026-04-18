"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { MultisendForm } from "@/components/multisend/multisend-form";
import { SendsList } from "@/components/multisend/sends-list";
import { SuccessModal } from "@/components/multisend/success-modal";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero, ToolStat, ToolStatBar, ToolStatDivider } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useAppStore } from "@/stores/app-store";

interface MultisendSuccess {
	tokenSymbol: string;
	recipientCount: number;
	totalAmount: bigint;
	txHash: string;
}

export default function MultisendPage() {
	useReveal();

	const searchParams = useSearchParams();
	const initialToken = searchParams.get("token") ?? undefined;

	const [successData, setSuccessData] = useState<MultisendSuccess | null>(null);
	const [formKey, setFormKey] = useState(0);
	const [listKey, setListKey] = useState(0);
	const { txConfirmed } = useTransactionToast();
	const addTransaction = useAppStore((s) => s.addTransaction);

	const handleSuccess = useCallback(
		(data: MultisendSuccess) => {
			setSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "multisend",
				description: `Sent ${data.tokenSymbol} to ${data.recipientCount} recipients`,
				timestamp: Date.now(),
			});
			setListKey((k) => k + 1);
		},
		[txConfirmed, addTransaction],
	);

	const handleSendAnother = useCallback(() => {
		setSuccessData(null);
		setFormKey((k) => k + 1);
	}, []);

	return (
		<>
			<CursorGlow color="rgba(74,222,128,0.06)" />
			<div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
				<ToolHero
					number="/02"
					label="Multisend · Distribute at scale"
					accent="green"
					title={
						<span>
							Send to a thousand.
							<br />
							<span className="italic" style={{ color: "var(--color-green)" }}>
								Pay as one.
							</span>
						</span>
					}
					description="Batch transfer any TIP-20 token to up to 500 addresses in a single transaction. Airdrops, payroll, round distributions — paid once in USDC, settled once on-chain."
					aside={
						<ToolStatBar>
							<ToolStat label="One tx" value="500" unit="max" accent="green" />
							<ToolStatDivider />
							<ToolStat label="Flat fee" value="0.5" unit="USDC" accent="gold" />
							<ToolStatDivider />
							<ToolStat label="Gas saved" value="98" unit="%" accent="green" />
						</ToolStatBar>
					}
				/>

				<div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
					{/* Form column */}
					<div className="reveal rounded-2xl border border-border-hair bg-bg-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8">
						<MultisendForm key={formKey} onSuccess={handleSuccess} initialToken={initialToken} />
					</div>

					{/* Informational rail */}
					<div
						className="reveal flex flex-col gap-6 lg:sticky lg:top-24"
						style={{ animationDelay: "0.15s" }}
					>
						<div
							className="relative overflow-hidden rounded-2xl border border-border-hair p-6"
							style={{
								background:
									"radial-gradient(circle at 50% 0%, rgba(74,222,128,0.08), transparent 60%), var(--color-bg-elevated)",
							}}
						>
							<div className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
								How it works
							</div>
							<ol className="space-y-4 text-sm text-text-secondary">
								<li className="flex gap-3">
									<span
										className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(74,222,128,0.3)] font-mono text-[10px]"
										style={{ color: "var(--color-green)" }}
									>
										1
									</span>
									<span>
										Pick the token and paste or upload a CSV of{" "}
										<span className="text-text-primary">address,amount</span> pairs.
									</span>
								</li>
								<li className="flex gap-3">
									<span
										className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(74,222,128,0.3)] font-mono text-[10px]"
										style={{ color: "var(--color-green)" }}
									>
										2
									</span>
									<span>
										Approve USDC for the flat fee and approve the token for the total batch amount.
									</span>
								</li>
								<li className="flex gap-3">
									<span
										className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(74,222,128,0.3)] font-mono text-[10px]"
										style={{ color: "var(--color-green)" }}
									>
										3
									</span>
									<span>
										Sign one transaction — up to 500 recipients settled atomically, with automatic
										refund on any failure.
									</span>
								</li>
							</ol>
						</div>

						<SendsList key={listKey} />
					</div>
				</div>
			</div>

			{successData && (
				<SuccessModal
					open={!!successData}
					onOpenChange={(open) => {
						if (!open) setSuccessData(null);
					}}
					tokenSymbol={successData.tokenSymbol}
					recipientCount={successData.recipientCount}
					totalAmount={successData.totalAmount}
					txHash={successData.txHash}
					onSendAnother={handleSendAnother}
				/>
			)}
		</>
	);
}
