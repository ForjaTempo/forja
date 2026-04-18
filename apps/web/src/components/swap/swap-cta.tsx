"use client";

import { ArrowLeftRightIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { checkSwapAvailable } from "@/actions/swaps";
import { hasSwap, PATHUSDC_ADDRESS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SwapCtaProps {
	tokenAddress: string;
	className?: string;
	/** When true, renders nothing instead of a disabled button when no liquidity. */
	hideWhenUnavailable?: boolean;
}

const liveBtnCls =
	"inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold text-[13px] text-[#1a1307] transition-transform hover:-translate-y-0.5";
const liveBtnStyle = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};
const disabledBtnCls =
	"inline-flex items-center gap-1.5 rounded-xl border border-border-hair bg-bg-field px-4 py-2 font-medium text-[13px] text-text-tertiary";

export function SwapCta({ tokenAddress, className, hideWhenUnavailable = false }: SwapCtaProps) {
	const [available, setAvailable] = useState<boolean | null>(null);

	useEffect(() => {
		if (!hasSwap) return;
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

	if (available === true) {
		return (
			<Link
				href={`/swap?tokenOut=${tokenAddress}`}
				className={cn(liveBtnCls, className)}
				style={liveBtnStyle}
			>
				<ArrowLeftRightIcon className="size-3.5" />
				Swap
			</Link>
		);
	}

	return (
		<span
			className={cn(disabledBtnCls, className)}
			title={
				available === false
					? "No liquidity yet — add a Uniswap v4 pool to enable trading"
					: undefined
			}
		>
			<ArrowLeftRightIcon className="size-3.5" />
			{available === null ? "Checking…" : "No pool"}
		</span>
	);
}
