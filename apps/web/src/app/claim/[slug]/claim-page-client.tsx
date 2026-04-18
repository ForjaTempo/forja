"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import { useAccount, useChainId } from "wagmi";
import {
	type CampaignStats,
	type ClaimCampaignRow,
	getCampaignStats,
	getProofForWallet,
} from "@/actions/claims";
import { ClaimAction } from "@/components/claim/claim-action";
import { ClaimHero } from "@/components/claim/claim-hero";
import { ClaimStats } from "@/components/claim/claim-stats";
import { ConnectButton } from "@/components/layout/connect-button";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ShareButtons } from "@/components/shared/share-buttons";
import { useReveal } from "@/components/shared/use-reveal";
import { useTokenInfo } from "@/hooks/use-token-info";
import { APP_URL, getExplorerUrl, TIP20_DECIMALS } from "@/lib/constants";

interface ClaimPageClientProps {
	initialCampaign: ClaimCampaignRow;
	initialStats: CampaignStats | null;
}

export function ClaimPageClient({ initialCampaign, initialStats }: ClaimPageClientProps) {
	useReveal();
	const { address: walletAddress, isConnected } = useAccount();
	const chainId = useChainId();
	const explorerUrl = getExplorerUrl(chainId);

	const tokenAddress = initialCampaign.tokenAddress as Hex;
	const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenInfo(tokenAddress);
	const decimals = tokenDecimals ?? TIP20_DECIMALS;

	const { data: stats = initialStats, refetch: refetchStats } = useQuery({
		queryKey: ["claim-stats", initialCampaign.slug],
		queryFn: () => getCampaignStats(initialCampaign.slug),
		staleTime: 30_000,
		initialData: initialStats,
		refetchInterval: 60_000,
	});

	const { data: proof, refetch: refetchProof } = useQuery({
		queryKey: ["claim-proof", initialCampaign.id, walletAddress],
		queryFn: () => {
			if (!walletAddress) return null;
			return getProofForWallet(initialCampaign.id, walletAddress);
		},
		staleTime: 30_000,
		enabled: !!walletAddress,
	});

	const handleClaimed = () => {
		void refetchProof();
		void refetchStats();
	};

	// Phase status: 'pending' | 'live' | 'ended'
	const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));
	useEffect(() => {
		const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
		return () => clearInterval(t);
	}, []);

	const startSec = Math.floor(new Date(initialCampaign.startTime).getTime() / 1000);
	const endSec = initialCampaign.endTime
		? Math.floor(new Date(initialCampaign.endTime).getTime() / 1000)
		: null;

	const phase: "pending" | "live" | "ended" = useMemo(() => {
		if (now < startSec) return "pending";
		if (endSec !== null && now > endSec) return "ended";
		return "live";
	}, [now, startSec, endSec]);

	return (
		<div className="noise relative min-h-screen overflow-hidden bg-bg-page">
			<CursorGlow color="rgba(255,107,61,0.06)" size={520} />

			<div className="pointer-events-none absolute inset-0 z-0">
				<div
					className="absolute top-[8%] right-[-15%] h-[600px] w-[600px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(255,107,61,0.08) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
				<div
					className="absolute bottom-[10%] left-[-10%] h-[500px] w-[500px] rounded-full"
					style={{
						background: "radial-gradient(circle, rgba(240,211,138,0.05) 0%, transparent 55%)",
						filter: "blur(60px)",
					}}
				/>
			</div>

			<main className="relative z-[5] mx-auto w-full max-w-3xl px-6 pt-16 pb-20 sm:px-8 sm:pt-20 sm:pb-24">
				<div className="reveal mb-5 inline-flex items-center gap-2.5 rounded-full border border-[rgba(255,107,61,0.2)] bg-[rgba(255,107,61,0.08)] py-1 pl-1 pr-3 text-xs text-ember">
					<span className="rounded-sm bg-ember px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#1a0a00]">
						/04
					</span>
					Merkle claim
				</div>

				<div className="reveal space-y-8">
					<ClaimHero campaign={initialCampaign} tokenSymbol={tokenSymbol} />

					<ClaimStats
						stats={stats}
						decimals={decimals}
						tokenSymbol={tokenSymbol}
						sweepEnabled={initialCampaign.sweepEnabled}
						swept={initialCampaign.swept}
					/>

					{!isConnected ? (
						<div className="flex flex-col items-center gap-3 rounded-xl border border-border-hair bg-bg-card p-8">
							<p className="text-sm text-text-secondary">
								Connect your wallet to check eligibility.
							</p>
							<ConnectButton />
						</div>
					) : (
						<ClaimAction
							campaign={initialCampaign}
							proof={proof ?? null}
							decimals={decimals}
							tokenSymbol={tokenSymbol}
							phase={phase}
							startSec={startSec}
							endSec={endSec}
							now={now}
							explorerUrl={explorerUrl}
							onClaimed={handleClaimed}
						/>
					)}

					<div className="space-y-2">
						<h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
							Share
						</h3>
						<ShareButtons
							url={`${APP_URL}/claim/${initialCampaign.slug}`}
							title={`${initialCampaign.title} on FORJA`}
							description={
								initialCampaign.description ??
								`Claim your share of this airdrop. ${initialCampaign.recipientCount} eligible recipients.`
							}
						/>
					</div>
				</div>
			</main>
		</div>
	);
}
