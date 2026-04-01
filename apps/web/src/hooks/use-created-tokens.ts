"use client";

import { useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { getTokensByCreator } from "@/actions/tokens";

export interface CreatedTokenEvent {
	name: string;
	symbol: string;
	address: Hex;
	initialSupply: bigint;
	txHash: Hex;
	blockNumber: bigint;
	timestamp: number | null;
}

export function useCreatedTokens(): {
	tokens: CreatedTokenEvent[];
	isLoading: boolean;
	refetch: () => void;
} {
	const { address } = useAccount();

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["created-tokens", address],
		queryFn: async () => {
			if (!address) return [];
			const rows = await getTokensByCreator(address);
			return rows.map(
				(row): CreatedTokenEvent => ({
					name: row.name,
					symbol: row.symbol,
					address: row.address as Hex,
					initialSupply: BigInt(row.initialSupply),
					txHash: row.txHash as Hex,
					blockNumber: BigInt(row.blockNumber),
					timestamp: row.createdAt ? Math.floor(row.createdAt.getTime() / 1000) : null,
				}),
			);
		},
		enabled: !!address,
	});

	return {
		tokens: data ?? [],
		isLoading,
		refetch,
	};
}
