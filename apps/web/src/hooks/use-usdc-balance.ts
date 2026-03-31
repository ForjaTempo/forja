"use client";

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

	const formatted = balance !== undefined ? Number(balance) / 10 ** TIP20_DECIMALS : undefined;

	return { balance, formatted, isLoading, refetch };
}
