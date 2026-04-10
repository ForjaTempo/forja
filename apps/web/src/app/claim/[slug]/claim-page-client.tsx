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
import { PageContainer } from "@/components/layout/page-container";
import { ShareButtons } from "@/components/shared/share-buttons";
import { useTokenInfo } from "@/hooks/use-token-info";
import { APP_URL, getExplorerUrl, TIP20_DECIMALS } from "@/lib/constants";

interface ClaimPageClientProps {
	initialCampaign: ClaimCampaignRow;
	initialStats: CampaignStats | null;
}

export function ClaimPageClient({ initialCampaign, initialStats }: ClaimPageClientProps) {
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
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-3xl space-y-8">
				<ClaimHero campaign={initialCampaign} tokenSymbol={tokenSymbol} />

				<ClaimStats
					stats={stats}
					decimals={decimals}
					tokenSymbol={tokenSymbol}
					sweepEnabled={initialCampaign.sweepEnabled}
					swept={initialCampaign.swept}
				/>

				{!isConnected ? (
					<div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
						<p className="text-sm text-smoke-dark">Connect your wallet to check eligibility.</p>
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
					<h3 className="text-sm font-medium text-smoke">Share</h3>
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
		</PageContainer>
	);
}
