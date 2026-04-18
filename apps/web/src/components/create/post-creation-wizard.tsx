"use client";

import {
	ArrowRightIcon,
	CoinsIcon,
	ExternalLinkIcon,
	GiftIcon,
	LockIcon,
	SendIcon,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ShareButtons } from "@/components/shared/share-buttons";
import { AddressDisplay } from "@/components/ui/address-display";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { APP_URL } from "@/lib/constants";
import { hasClaimer } from "@/lib/contracts";

interface PostCreationWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	name: string;
	symbol: string;
	tokenAddress: string;
	txHash: string;
	onCreateAnother: () => void;
}

interface NextStepRow {
	icon: ComponentType<{ className?: string }>;
	title: string;
	description: string;
	accent: string;
	href: string;
	external?: boolean;
}

export function PostCreationWizard({
	open,
	onOpenChange,
	name,
	symbol,
	tokenAddress,
	txHash,
	onCreateAnother,
}: PostCreationWizardProps) {
	const explorerUrl = useExplorerUrl();
	const tokenUrl = `${APP_URL}/tokens/${tokenAddress}`;

	const nextSteps: NextStepRow[] = [
		{
			icon: SendIcon,
			title: "Distribute to holders",
			description: "Send tokens to multiple recipients at once.",
			accent: "var(--color-green)",
			href: `/multisend?token=${tokenAddress}`,
		},
		{
			icon: LockIcon,
			title: "Lock team tokens",
			description: "Vesting with cliff, linear or revocable schedules.",
			accent: "var(--color-indigo)",
			href: `/lock?token=${tokenAddress}`,
		},
		...(hasClaimer
			? [
					{
						icon: GiftIcon,
						title: "Run an airdrop",
						description: "Merkle-proof claim campaign for thousands of wallets.",
						accent: "var(--color-ember)",
						href: `/claim/create?token=${tokenAddress}`,
					} satisfies NextStepRow,
				]
			: []),
		{
			icon: CoinsIcon,
			title: "Open on explorer",
			description: "Inspect the contract on Tempo Explorer.",
			accent: "var(--color-gold)",
			href: `${explorerUrl}/address/${tokenAddress}`,
			external: true,
		},
	];

	const renderStep = (step: NextStepRow): ReactNode => {
		const Inner = (
			<div className="group flex items-center gap-3 rounded-xl border border-border-hair bg-bg-field/60 p-3.5 transition-colors hover:border-border-subtle hover:bg-bg-field">
				<div
					className="flex size-10 shrink-0 items-center justify-center rounded-lg border"
					style={{
						background: `linear-gradient(135deg, ${step.accent}25, ${step.accent}08)`,
						borderColor: `${step.accent}30`,
						color: step.accent,
					}}
				>
					<step.icon className="size-4" />
				</div>
				<div className="flex-1">
					<p className="font-display text-[15px] text-text-primary tracking-[-0.01em]">
						{step.title}
					</p>
					<p className="text-[12px] text-text-tertiary">{step.description}</p>
				</div>
				{step.external ? (
					<ExternalLinkIcon className="size-4 text-text-tertiary transition-colors group-hover:text-text-secondary" />
				) : (
					<ArrowRightIcon className="size-4 text-text-tertiary transition-colors group-hover:text-text-secondary" />
				)}
			</div>
		);
		if (step.external) {
			return (
				<a
					key={step.href}
					href={step.href}
					target="_blank"
					rel="noopener noreferrer"
					className="block"
				>
					{Inner}
				</a>
			);
		}
		return (
			<Link key={step.href} href={step.href} className="block">
				{Inner}
			</Link>
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto border-border-subtle bg-bg-elevated sm:max-w-lg">
				<div className="mb-4 flex items-center gap-2 font-mono text-[11px] text-green uppercase tracking-[0.2em]">
					<span
						aria-hidden
						className="size-1.5 animate-[ember-flicker_2s_ease-in-out_infinite] rounded-full bg-green shadow-[0_0_8px_var(--color-green)]"
					/>
					Deployed
				</div>
				<h2 className="font-display text-[32px] leading-[1.1] tracking-[-0.02em]">
					<span>{name}</span> is <span className="gold-text italic">live on Tempo.</span>
				</h2>
				<p className="mt-2 font-mono text-[13px] text-text-secondary">${symbol}</p>

				<div className="mt-5 space-y-3 rounded-xl border border-border-hair bg-bg-field/60 p-4">
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Address
						</span>
						<AddressDisplay address={tokenAddress} showExplorer />
					</div>
					<div className="flex items-center justify-between text-[13px]">
						<span className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
							Transaction
						</span>
						<a
							href={`${explorerUrl}/tx/${txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-mono text-text-secondary transition-colors hover:text-gold"
						>
							{`${txHash.slice(0, 8)}…${txHash.slice(-6)}`}
							<ExternalLinkIcon className="size-3" />
						</a>
					</div>
				</div>

				<div className="mt-6 space-y-2">
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						What's next
					</div>
					<div className="space-y-2">{nextSteps.map((s) => renderStep(s))}</div>
				</div>

				<div className="mt-6 space-y-2">
					<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Share your token
					</div>
					<ShareButtons
						url={tokenUrl}
						title={`I just created $${symbol} on FORJA!`}
						description="Token toolkit for Tempo blockchain — forja.fun"
					/>
				</div>

				<div className="mt-6 flex gap-3">
					<button
						type="button"
						onClick={onCreateAnother}
						className="flex-1 rounded-xl border border-border-hair bg-bg-elevated px-4 py-3 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						Forge another
					</button>
					<Link
						href={`/tokens/${tokenAddress}`}
						className="inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5"
						style={{
							background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
							boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
						}}
					>
						View token page
					</Link>
				</div>
			</DialogContent>
		</Dialog>
	);
}
