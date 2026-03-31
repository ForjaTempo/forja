"use client";

import { useReadContract } from "wagmi";
import { FEES, TIP20_DECIMALS } from "@/lib/constants";
import { tokenFactoryConfig } from "@/lib/contracts";

export function useCreateFee() {
	const { data: fee, isLoading } = useReadContract({
		...tokenFactoryConfig,
		functionName: "createFee",
	});

	const formatted = fee !== undefined ? Number(fee) / 10 ** TIP20_DECIMALS : FEES.tokenCreate;

	return { fee, formatted, isLoading };
}
