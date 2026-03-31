"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hex, Log } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { tokenFactoryConfig } from "@/lib/contracts";
import { getLogsSafe } from "@/lib/get-logs-safe";

const TOKEN_CREATED_EVENT = {
	type: "event" as const,
	name: "TokenCreated" as const,
	inputs: [
		{ name: "creator", type: "address" as const, indexed: true },
		{ name: "token", type: "address" as const, indexed: true },
		{ name: "name", type: "string" as const, indexed: false },
		{ name: "symbol", type: "string" as const, indexed: false },
		{ name: "initialSupply", type: "uint256" as const, indexed: false },
	],
};

export interface CreatedTokenEvent {
	name: string;
	symbol: string;
	address: Hex;
	initialSupply: bigint;
	txHash: Hex;
	blockNumber: bigint;
	timestamp: number | null;
}

function parseLogs(logs: Log[]): Omit<CreatedTokenEvent, "timestamp">[] {
	return logs
		.map((log) => {
			const args = (log as unknown as { args: Record<string, unknown> }).args;
			return {
				name: args.name as string,
				symbol: args.symbol as string,
				address: args.token as Hex,
				initialSupply: args.initialSupply as bigint,
				txHash: log.transactionHash as Hex,
				blockNumber: log.blockNumber as bigint,
			};
		})
		.reverse();
}

export function useCreatedTokens(): {
	tokens: CreatedTokenEvent[];
	isLoading: boolean;
	refetch: () => void;
} {
	const { address } = useAccount();
	const publicClient = usePublicClient();
	const [tokens, setTokens] = useState<CreatedTokenEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchTokens = useCallback(() => {
		if (!address || !publicClient) {
			setTokens([]);
			return;
		}

		setIsLoading(true);
		getLogsSafe({
			client: publicClient,
			address: tokenFactoryConfig.address,
			event: TOKEN_CREATED_EVENT,
			args: { creator: address },
		})
			.then(async (logs) => {
				const parsed = parseLogs(logs);
				if (parsed.length === 0) {
					setTokens([]);
					return;
				}

				const uniqueBlocks = [...new Set(parsed.map((t) => t.blockNumber))];
				const timestampMap = new Map<bigint, number>();

				await Promise.all(
					uniqueBlocks.map(async (blockNum) => {
						try {
							const block = await publicClient.getBlock({ blockNumber: blockNum });
							timestampMap.set(blockNum, Number(block.timestamp));
						} catch {
							// Timestamp unavailable
						}
					}),
				);

				setTokens(
					parsed.map((t) => ({
						...t,
						timestamp: timestampMap.get(t.blockNumber) ?? null,
					})),
				);
			})
			.catch(() => setTokens([]))
			.finally(() => setIsLoading(false));
	}, [address, publicClient]);

	useEffect(() => {
		fetchTokens();
	}, [fetchTokens]);

	return { tokens, isLoading, refetch: fetchTokens };
}
