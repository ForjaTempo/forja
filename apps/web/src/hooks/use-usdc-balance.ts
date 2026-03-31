"use client";

import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { TIP20_DECIMALS } from "@/lib/constants";
import { pathusdcConfig } from "@/lib/contracts";

export function useUsdcBalance() {
	const { address } = useAccount();

	const {
		data: balance,
		isLoading,
		refetch,
	} = useReadContract({
		...pathusdcConfig,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled: !!address },
	});

	// Return string to avoid Number precision loss on large balances
	const formatted = balance !== undefined ? formatUnits(balance, TIP20_DECIMALS) : undefined;

	return { balance, formatted, isLoading, refetch };
}
