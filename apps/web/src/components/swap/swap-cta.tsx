"use client";

import { ArrowLeftRightIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { checkSwapAvailable } from "@/actions/swaps";
import { Button } from "@/components/ui/button";
import { hasSwap, PATHUSDC_ADDRESS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SwapCtaProps {
	tokenAddress: string;
	className?: string;
	/** When true, renders nothing instead of a disabled button when no liquidity. */
	hideWhenUnavailable?: boolean;
}

/**
 * "Trade this token" entry point for the Token Hub + Launch detail pages.
 * Probes pool existence (USDC ↔ token) and only shows the live link when a
 * pool has been initialised — otherwise the button is disabled with a tooltip.
 */
export function SwapCta({ tokenAddress, className, hideWhenUnavailable = false }: SwapCtaProps) {
	const [available, setAvailable] = useState<boolean | null>(null);

	useEffect(() => {
		if (!hasSwap) return;
		// Skip check if the displayed token *is* USDC.
		if (tokenAddress.toLowerCase() === PATHUSDC_ADDRESS.toLowerCase()) {
			setAvailable(false);
			return;
		}
		let cancelled = false;
		(async () => {
			const ok = await checkSwapAvailable(tokenAddress, PATHUSDC_ADDRESS);
			if (!cancelled) setAvailable(ok);
		})();
		return () => {
			cancelled = true;
		};
	}, [tokenAddress]);

	if (!hasSwap) return null;
	if (hideWhenUnavailable && available === false) return null;

	return (
		<Button
			asChild={available === true}
			disabled={available !== true}
			variant="default"
			size="sm"
			className={cn("gap-1.5", className)}
			title={
				available === false
					? "No liquidity yet — add a Uniswap v4 pool to enable trading"
					: undefined
			}
		>
			{available === true ? (
				<Link href={`/swap?tokenOut=${tokenAddress}`}>
					<ArrowLeftRightIcon className="size-3.5" />
					Swap
				</Link>
			) : (
				<span>
					<ArrowLeftRightIcon className="size-3.5" />
					{available === null ? "Checking…" : "No pool"}
				</span>
			)}
		</Button>
	);
}
