"use client";

import { useReadContract } from "wagmi";
import { FEES, TIP20_DECIMALS } from "@/lib/constants";
import { activeLockerConfig } from "@/lib/contracts";

export function useLockFee() {
	const { data: fee, isLoading } = useReadContract({
		...activeLockerConfig,
		functionName: "lockFee",
	});

	const formatted = fee !== undefined ? Number(fee) / 10 ** TIP20_DECIMALS : FEES.tokenLock;

	return { fee, formatted, isLoading };
}
