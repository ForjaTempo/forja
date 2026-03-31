"use client";

import { useCallback, useEffect } from "react";
import type { Hex } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { pathusdcConfig } from "@/lib/contracts";

interface UseUsdcApprovalOptions {
	spender: `0x${string}`;
	amount: bigint;
}

interface UseUsdcApprovalReturn {
	allowance: bigint | undefined;
	needsApproval: boolean;
	isAllowanceLoading: boolean;
	approve: () => void;
	isApproving: boolean;
	isApprovalConfirming: boolean;
	isApprovalConfirmed: boolean;
	approvalHash: Hex | undefined;
	approveError: Error | null;
	resetApproval: () => void;
}

export function useUsdcApproval({
	spender,
	amount,
}: UseUsdcApprovalOptions): UseUsdcApprovalReturn {
	const { address } = useAccount();

	const {
		data: allowance,
		isLoading: isAllowanceLoading,
		refetch: refetchAllowance,
	} = useReadContract({
		...pathusdcConfig,
		functionName: "allowance",
		args: address ? [address, spender] : undefined,
		query: { enabled: !!address },
	});

	const {
		writeContract,
		data: approvalHash,
		isPending: isApproving,
		error: approveError,
		reset: resetApproval,
	} = useWriteContract();

	const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } =
		useWaitForTransactionReceipt({
			hash: approvalHash,
		});

	useEffect(() => {
		if (isApprovalConfirmed) {
			refetchAllowance();
		}
	}, [isApprovalConfirmed, refetchAllowance]);

	const needsApproval = allowance !== undefined && allowance < amount;

	const approve = useCallback(() => {
		writeContract({
			...pathusdcConfig,
			functionName: "approve",
			args: [spender, amount],
		});
	}, [writeContract, spender, amount]);

	return {
		allowance,
		needsApproval,
		isAllowanceLoading,
		approve,
		isApproving,
		isApprovalConfirming,
		isApprovalConfirmed,
		approvalHash,
		approveError: approveError || null,
		resetApproval,
	};
}
