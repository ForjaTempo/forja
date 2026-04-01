"use client";

import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { getMultisendsBySender } from "@/actions/multisends";

export interface MultisendEvent {
	token: Hex;
	recipientCount: bigint;
	totalAmount: bigint;
	txHash: Hex;
	blockNumber: bigint;
	timestamp: number | null;
}

export function useMultisendHistory(): {
	sends: MultisendEvent[];
	isLoading: boolean;
	refetch: () => void;
} {
	const { address } = useAccount();

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["multisend-history", address],
		queryFn: async () => {
			if (!address) return [];
			const rows = await getMultisendsBySender(address);
			return rows.map(
				(row): MultisendEvent => ({
					token: row.tokenAddress as Hex,
					recipientCount: BigInt(row.recipientCount),
					totalAmount: BigInt(row.totalAmount),
					txHash: row.txHash as Hex,
					blockNumber: BigInt(row.blockNumber),
					timestamp: row.createdAt ? Math.floor(row.createdAt.getTime() / 1000) : null,
				}),
			);
		},
		enabled: !!address,
	});

	return {
		sends: data ?? [],
		isLoading,
		refetch,
	};
}
