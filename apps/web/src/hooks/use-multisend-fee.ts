"use client";

import { useReadContract } from "wagmi";
import { FEES, TIP20_DECIMALS } from "@/lib/constants";
import { multisendConfig } from "@/lib/contracts";

export function useMultisendFee() {
	const { data: fee, isLoading } = useReadContract({
		...multisendConfig,
		functionName: "multisendFee",
	});

	const formatted = fee !== undefined ? Number(fee) / 10 ** TIP20_DECIMALS : FEES.multisend;

	return { fee, formatted, isLoading };
}
