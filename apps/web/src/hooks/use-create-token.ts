"use client";

import { useMemo } from "react";
import { decodeEventLog, type Hex, parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { TIP20_DECIMALS } from "@/lib/constants";
import { tokenFactoryConfig } from "@/lib/contracts";

interface UseCreateTokenReturn {
	createToken: (name: string, symbol: string, initialSupply: string) => void;
	isCreating: boolean;
	isConfirming: boolean;
	isSuccess: boolean;
	txHash: Hex | undefined;
	tokenAddress: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

export function useCreateToken(): UseCreateTokenReturn {
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
	} = useWaitForTransactionReceipt({
		hash: txHash,
	});

	const tokenAddress = useMemo<Hex | undefined>(() => {
		if (!receipt) return undefined;
		for (const log of receipt.logs) {
			try {
				const decoded = decodeEventLog({
					abi: tokenFactoryConfig.abi,
					data: log.data,
					topics: log.topics,
				});
				if (decoded.eventName === "TokenCreated") {
					return decoded.args.token;
				}
			} catch {
				// Not our event, skip
			}
		}
		return undefined;
	}, [receipt]);

	const createToken = (name: string, symbol: string, initialSupply: string) => {
		const supply = initialSupply ? parseUnits(initialSupply, TIP20_DECIMALS) : 0n;
		writeContract({
			...tokenFactoryConfig,
			functionName: "createToken",
			args: [name, symbol, supply],
		});
	};

	const error = writeError || receiptError || null;

	return {
		createToken,
		isCreating,
		isConfirming,
		isSuccess,
		txHash,
		tokenAddress,
		error,
		reset,
	};
}
