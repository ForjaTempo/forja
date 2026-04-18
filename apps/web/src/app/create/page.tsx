"use client";

import { useCallback, useState } from "react";
import { setTokenTags } from "@/actions/token-hub";
import { updateTokenLogo } from "@/actions/upload";
import { ForgeAnimation } from "@/components/create/forge-animation";
import { PostCreationWizard } from "@/components/create/post-creation-wizard";
import { TokenForm } from "@/components/create/token-form";
import { TokensList } from "@/components/create/tokens-list";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { useAppStore } from "@/stores/app-store";

interface CreatedToken {
	name: string;
	symbol: string;
	txHash: string;
	tokenAddress: string;
	logoUrl?: string;
	tags?: string[];
}

export default function CreatePage() {
	useReveal();

	const [successData, setSuccessData] = useState<CreatedToken | null>(null);
	const [formKey, setFormKey] = useState(0);
	const [listKey, setListKey] = useState(0);
	const { txConfirmed } = useTransactionToast();
	const { ensureAuth } = useWalletAuth();
	const addTransaction = useAppStore((s) => s.addTransaction);

	const handleSuccess = useCallback(
		(data: CreatedToken) => {
			setSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "create",
				description: `Created ${data.symbol} token`,
				timestamp: Date.now(),
			});
			setListKey((k) => k + 1);

			// Attach uploaded logo to token cache (fire-and-forget)
			if (data.logoUrl) {
				updateTokenLogo(data.tokenAddress, data.logoUrl).catch(() => {});
			}

			// Save tags (creator-gated, fire-and-forget)
			if (data.tags && data.tags.length > 0) {
				(async () => {
					try {
						const authed = await ensureAuth();
						if (!authed) return;
						await setTokenTags({ address: data.tokenAddress, tags: data.tags ?? [] });
					} catch (err) {
						console.error("[create] setTokenTags failed:", err);
					}
				})();
			}
		},
		[txConfirmed, addTransaction, ensureAuth],
	);

	const handleCreateAnother = useCallback(() => {
		setSuccessData(null);
		setFormKey((k) => k + 1);
	}, []);

	return (
		<>
			<CursorGlow color="rgba(255,107,61,0.06)" />
			<div className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
				<ToolHero
					number="/01"
					label="Create · Deploy a TIP-20"
					accent="gold"
					title={
						<span>
							Forge a token.
							<br />
							<span className="gold-text italic">In thirty seconds.</span>
						</span>
					}
					description="Pick the parameters. We compile a battle-tested TIP-20 implementation, sign it to Tempo, and hand you the contract address."
				/>

				<div className="mt-16 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
					{/* Form column */}
					<div className="reveal rounded-2xl border border-border-hair bg-bg-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8">
						<TokenForm key={formKey} onSuccess={handleSuccess} />
					</div>

					{/* Forge visual column */}
					<div
						className="reveal flex flex-col gap-6 lg:sticky lg:top-24"
						style={{ animationDelay: "0.15s" }}
					>
						<div
							className="relative overflow-hidden rounded-2xl border border-border-hair p-8"
							style={{
								background:
									"radial-gradient(circle at 50% 80%, rgba(255,107,61,0.12), transparent 60%), linear-gradient(180deg, var(--color-bg-elevated), var(--color-bg-card))",
							}}
						>
							<div className="mb-4 flex items-center justify-between">
								<div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary">
									The forge
								</div>
								<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ember">
									<span
										className="h-1.5 w-1.5 rounded-full bg-ember"
										style={{ animation: "ember-flicker 1.5s infinite" }}
									/>
									Heating
								</div>
							</div>
							<ForgeAnimation />
						</div>

						<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
								What you get
							</div>
							<ul className="space-y-2 text-sm text-text-secondary">
								<li className="flex items-start gap-2">
									<span className="mt-2 h-1 w-1 rounded-full bg-gold" />
									OpenZeppelin-audited TIP-20 implementation
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-2 h-1 w-1 rounded-full bg-gold" />
									Deployed directly to mainnet, no hidden owner keys
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-2 h-1 w-1 rounded-full bg-gold" />
									Indexed on Forja automatically for discovery
								</li>
							</ul>
						</div>

						<TokensList key={listKey} />
					</div>
				</div>
			</div>

			{successData && (
				<PostCreationWizard
					open={!!successData}
					onOpenChange={(open) => {
						if (!open) setSuccessData(null);
					}}
					name={successData.name}
					symbol={successData.symbol}
					tokenAddress={successData.tokenAddress}
					txHash={successData.txHash}
					onCreateAnother={handleCreateAnother}
				/>
			)}
		</>
	);
}
