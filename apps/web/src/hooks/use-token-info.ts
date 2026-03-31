"use client";

import type { Hex } from "viem";
import { useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/contracts";

export function useTokenInfo(tokenAddress: Hex | undefined) {
	const enabled = !!tokenAddress && tokenAddress.length === 42;

	const { data: name, isLoading: isNameLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "name",
		query: { enabled },
	});

	const { data: symbol, isLoading: isSymbolLoading } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "symbol",
		query: { enabled },
	});

	const {
		data: decimals,
		isLoading: isDecimalsLoading,
		isError,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "decimals",
		query: { enabled },
	});

	const isLoading = isNameLoading || isSymbolLoading || isDecimalsLoading;

	return {
		name: name as string | undefined,
		symbol: symbol as string | undefined,
		decimals: decimals as number | undefined,
		isLoading: enabled && isLoading,
		isError: enabled && isError,
	};
}
