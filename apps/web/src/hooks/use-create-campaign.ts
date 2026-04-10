"use client";

import { useMemo } from "react";
import type { Hex } from "viem";
import { decodeEventLog } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { claimerConfig } from "@/lib/contracts";

interface UseCreateCampaignReturn {
	createCampaign: (
		token: Hex,
		merkleRoot: Hex,
		totalDeposit: bigint,
		startTime: bigint,
		endTime: bigint,
		sweepEnabled: boolean,
	) => void;
	isCreating: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	campaignId: bigint | null;
	createdBlock: number | null;
	error: Error | null;
	reset: () => void;
}

export function useCreateCampaign(): UseCreateCampaignReturn {
	const {
		writeContract,
		data: txHash,
		isPending: isCreating,
		error: writeError,
		reset,
	} = useWriteContract();

	const {
		data: receipt,
		isLoading: isConfirming,
		isSuccess,
		error: receiptError,
	} = useWaitForTransactionReceipt({ hash: txHash });

	const { campaignId, createdBlock } = useMemo<{
		campaignId: bigint | null;
		createdBlock: number | null;
	}>(() => {
		if (!receipt) return { campaignId: null, createdBlock: null };
		for (const log of receipt.logs) {
			try {
				const decoded = decodeEventLog({
					abi: claimerConfig.abi,
					data: log.data,
					topics: log.topics,
				});
				if (decoded.eventName === "CampaignCreated") {
					const id = (decoded.args as { campaignId: bigint }).campaignId;
					return {
						campaignId: id,
						createdBlock: Number(receipt.blockNumber),
					};
				}
			} catch {
				// Not our event
			}
		}
		return { campaignId: null, createdBlock: null };
	}, [receipt]);

	const createCampaign = (
		token: Hex,
		merkleRoot: Hex,
		totalDeposit: bigint,
		startTime: bigint,
		endTime: bigint,
		sweepEnabled: boolean,
	) => {
		writeContract({
			...claimerConfig,
			functionName: "createCampaign",
			args: [token, merkleRoot, totalDeposit, startTime, endTime, sweepEnabled],
		});
	};

	const error = writeError || receiptError || null;

	return {
		createCampaign,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		campaignId,
		createdBlock,
		error,
		reset,
	};
}
