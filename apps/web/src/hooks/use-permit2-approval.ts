"use client";

import { useEffect } from "react";
import { type Hex, maxUint256 } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { PERMIT2_ADDRESS } from "@/lib/constants";
import { erc20Abi } from "@/lib/contracts";

interface UsePermit2ApprovalParams {
	tokenAddress: Hex | undefined;
	amount: bigint;
}

interface UsePermit2ApprovalReturn {
	allowance: bigint | undefined;
	needsApproval: boolean;
	approve: () => void;
	isApproving: boolean;
	isApprovalConfirming: boolean;
	isApprovalConfirmed: boolean;
	approvalHash: Hex | undefined;
	approveError: Error | null;
	resetApproval: () => void;
}

/**
 * Permit2 lives between the user's wallet and the swap router. The user must
 * approve Permit2 once per token (the standard ERC-20 approve), after which
 * every swap reuses that allowance through gasless EIP-712 signatures.
 */
export function usePermit2Approval({
	tokenAddress,
	amount,
}: UsePermit2ApprovalParams): UsePermit2ApprovalReturn {
	const { address } = useAccount();
	const enabled = !!address && !!tokenAddress && tokenAddress.length === 42;

	const { data: allowance, refetch: refetchAllowance } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "allowance",
		args: address ? [address, PERMIT2_ADDRESS] : undefined,
		query: { enabled },
	});

	const {
		writeContract,
		data: approvalHash,
		isPending: isApproving,
		error: writeError,
		reset: resetApproval,
	} = useWriteContract();

	const {
		isLoading: isApprovalConfirming,
		isSuccess: isApprovalConfirmed,
		error: receiptError,
	} = useWaitForTransactionReceipt({ hash: approvalHash });

	useEffect(() => {
		if (isApprovalConfirmed) refetchAllowance();
	}, [isApprovalConfirmed, refetchAllowance]);

	const approve = () => {
		if (!tokenAddress) return;
		writeContract({
			address: tokenAddress,
			abi: erc20Abi,
			functionName: "approve",
			args: [PERMIT2_ADDRESS, maxUint256],
		});
	};

	const needsApproval = allowance === undefined ? false : (allowance as bigint) < amount;

	return {
		allowance: allowance as bigint | undefined,
		needsApproval,
		approve,
		isApproving,
		isApprovalConfirming,
		isApprovalConfirmed,
		approvalHash,
		approveError: writeError ?? receiptError ?? null,
		resetApproval,
	};
}
