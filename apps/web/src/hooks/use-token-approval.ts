"use client";

import { useCallback, useEffect } from "react";
import type { Hex } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { erc20Abi } from "@/lib/contracts";

interface UseTokenApprovalOptions {
	tokenAddress: Hex | undefined;
	spender: `0x${string}`;
	amount: bigint;
}

interface UseTokenApprovalReturn {
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

export function useTokenApproval({
	tokenAddress,
	spender,
	amount,
}: UseTokenApprovalOptions): UseTokenApprovalReturn {
	const { address } = useAccount();

	const enabled = !!address && !!tokenAddress && tokenAddress.length === 42;

	const {
		data: allowance,
		isLoading: isAllowanceLoading,
		refetch: refetchAllowance,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "allowance",
		args: address ? [address, spender] : undefined,
		query: { enabled },
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
		if (!tokenAddress) return;
		writeContract({
			address: tokenAddress,
			abi: erc20Abi,
			functionName: "approve",
			args: [spender, amount],
		});
	}, [writeContract, tokenAddress, spender, amount]);

	return {
		allowance,
		needsApproval,
		isAllowanceLoading: enabled && isAllowanceLoading,
		approve,
		isApproving,
		isApprovalConfirming,
		isApprovalConfirmed,
		approvalHash,
		approveError: approveError || null,
		resetApproval,
	};
}
