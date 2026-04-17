"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { PageHeader } from "@/components/ui/page-header";
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
		<div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
			<div className="space-y-6">
				<PageHeader
					title="Swap"
					description="Trade any TIP-20 token on Tempo. Powered by Uniswap v4 + 0.25% protocol fee."
				/>
				{!hasSwap && (
					<div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
						Swap is currently in canary preview. The router contract is being deployed; quotes work,
						execution will activate once the address is wired into env.
					</div>
				)}
				<div className="mx-auto max-w-md">
					<SwapPanel initialTokenIn={initialIn} initialTokenOut={initialOut} />
				</div>
			</div>
			<aside className="space-y-4 lg:pt-16">
				<SwapHistory scope="user" limit={5} />
				<SwapHistory scope="global" limit={5} />
			</aside>
		</div>
	);
}
