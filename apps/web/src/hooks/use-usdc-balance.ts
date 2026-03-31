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

	const formatted =
		balance !== undefined ? Number(formatUnits(balance, TIP20_DECIMALS)) : undefined;

	return { balance, formatted, isLoading, refetch };
}
