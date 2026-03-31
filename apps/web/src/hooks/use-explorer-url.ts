"use client";

import { useChainId } from "wagmi";
import { getExplorerUrl } from "@/lib/constants";

export function useExplorerUrl(): string {
	const chainId = useChainId();
	return getExplorerUrl(chainId);
}
