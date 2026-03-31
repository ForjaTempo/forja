"use client";

import { formatUnits, type Hex } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { TIP20_DECIMALS } from "@/lib/constants";
import { erc20Abi } from "@/lib/contracts";

export function useTokenBalance(tokenAddress: Hex | undefined) {
	const { address } = useAccount();

	const enabled = !!address && !!tokenAddress && tokenAddress.length === 42;

	const {
		data: balance,
		isLoading,
		refetch,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled },
	});

	const formatted = balance !== undefined ? formatUnits(balance, TIP20_DECIMALS) : undefined;

	return { balance, formatted, isLoading, refetch };
}
