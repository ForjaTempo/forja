"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import { PageContainer } from "@/components/layout/page-container";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { ToolHero } from "@/components/shared/tool-hero";
import { useReveal } from "@/components/shared/use-reveal";
import { useTokenInfo } from "@/hooks/use-token-info";
import { hasSwap, PATHUSDC_ADDRESS } from "@/lib/constants";
import { SwapHistory } from "./swap-history";
import { SwapPanel } from "./swap-panel";
import type { TokenOption } from "./token-picker";

const PATHUSDC_OPTION: TokenOption = {
	address: PATHUSDC_ADDRESS,
	symbol: "USDC",
	name: "Path USDC",
	decimals: 6,
};

export function SwapClient() {
	useReveal();
	const searchParams = useSearchParams();
	const tokenInParam = searchParams.get("tokenIn");
	const tokenOutParam = searchParams.get("tokenOut");

	const tokenInValid =
		tokenInParam && isAddress(tokenInParam) ? (tokenInParam as `0x${string}`) : undefined;
	const tokenOutValid =
		tokenOutParam && isAddress(tokenOutParam) ? (tokenOutParam as `0x${string}`) : undefined;

	const inInfo = useTokenInfo(tokenInValid);
	const outInfo = useTokenInfo(tokenOutValid);

	const [initialIn, setInitialIn] = useState<TokenOption | undefined>();
	const [initialOut, setInitialOut] = useState<TokenOption | undefined>();
	const [historyKey, setHistoryKey] = useState(0);
	const onSwapSuccess = useCallback(() => setHistoryKey((k) => k + 1), []);

	useEffect(() => {
		// Default tokenIn = USDC if not specified.
		if (!tokenInValid) {
			setInitialIn(PATHUSDC_OPTION);
			return;
		}
		if (inInfo.symbol && inInfo.decimals !== undefined) {
			setInitialIn({
				address: tokenInValid,
				symbol: inInfo.symbol,
				name: inInfo.name ?? inInfo.symbol,
				decimals: inInfo.decimals,
			});
		}
	}, [tokenInValid, inInfo.symbol, inInfo.name, inInfo.decimals]);

	useEffect(() => {
		if (!tokenOutValid) return;
		if (outInfo.symbol && outInfo.decimals !== undefined) {
			setInitialOut({
				address: tokenOutValid,
				symbol: outInfo.symbol,
				name: outInfo.name ?? outInfo.symbol,
				decimals: outInfo.decimals,
			});
		}
	}, [tokenOutValid, outInfo.symbol, outInfo.name, outInfo.decimals]);

	return (
		<>
			<CursorGlow color="rgba(240,211,138,0.06)" size={520} />
			<PageContainer className="py-16 sm:py-20 lg:py-24">
				<div className="space-y-10">
					<ToolHero
						number="/06"
						label="Swap · Route via v4 + native DEX"
						accent="gold"
						title={
							<>
								Trade any token.
								<br />
								<span className="gold-text italic">Flat 0.25%.</span>
							</>
						}
						description="Best route picked automatically between Uniswap v4 pools and Tempo's native DEX. Sign once, swap many."
					/>

					{!hasSwap && (
						<div className="reveal rounded-2xl border border-ember/30 bg-ember/5 p-4 text-sm text-ember">
							Swap is currently in canary preview. The router contract is being deployed; quotes
							work, execution will activate once the address is wired into env.
						</div>
					)}

					<div className="reveal mx-auto grid w-full max-w-[920px] gap-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-5">
						<div className="mx-auto w-full max-w-md lg:mx-0">
							<SwapPanel
								initialTokenIn={initialIn}
								initialTokenOut={initialOut}
								onSwapSuccess={onSwapSuccess}
							/>
						</div>
						<aside className="space-y-4">
							<SwapHistory scope="user" limit={6} refreshKey={historyKey} />
							<SwapHistory scope="global" limit={4} refreshKey={historyKey} />
						</aside>
					</div>
				</div>
			</PageContainer>
		</>
	);
}
