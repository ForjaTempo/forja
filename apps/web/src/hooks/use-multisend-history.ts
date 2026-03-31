"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hex, Log } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { multisendConfig } from "@/lib/contracts";
import { getLogsSafe } from "@/lib/get-logs-safe";

const MULTISEND_EXECUTED_EVENT = {
	type: "event" as const,
	name: "MultisendExecuted" as const,
	inputs: [
		{ name: "sender", type: "address" as const, indexed: true },
		{ name: "token", type: "address" as const, indexed: true },
		{ name: "recipientCount", type: "uint256" as const, indexed: false },
		{ name: "totalAmount", type: "uint256" as const, indexed: false },
	],
};

export interface MultisendEvent {
	token: Hex;
	recipientCount: bigint;
	totalAmount: bigint;
	txHash: Hex;
	blockNumber: bigint;
	timestamp: number | null;
}

function parseLogs(logs: Log[]): Omit<MultisendEvent, "timestamp">[] {
	return logs
		.map((log) => {
			const args = (log as unknown as { args: Record<string, unknown> }).args;
			return {
				token: args.token as Hex,
				recipientCount: args.recipientCount as bigint,
				totalAmount: args.totalAmount as bigint,
				txHash: log.transactionHash as Hex,
				blockNumber: log.blockNumber as bigint,
			};
		})
		.reverse();
}

export function useMultisendHistory(): {
	sends: MultisendEvent[];
	isLoading: boolean;
	refetch: () => void;
} {
	const { address } = useAccount();
	const publicClient = usePublicClient();
	const [sends, setSends] = useState<MultisendEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchSends = useCallback(() => {
		if (!address || !publicClient) {
			setSends([]);
			return;
		}

		setIsLoading(true);
		getLogsSafe({
			client: publicClient,
			address: multisendConfig.address,
			event: MULTISEND_EXECUTED_EVENT,
			args: { sender: address },
		})
			.then(async (logs) => {
				const parsed = parseLogs(logs);
				if (parsed.length === 0) {
					setSends([]);
					return;
				}

				const uniqueBlocks = [...new Set(parsed.map((s) => s.blockNumber))];
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

				setSends(
					parsed.map((s) => ({
						...s,
						timestamp: timestampMap.get(s.blockNumber) ?? null,
					})),
				);
			})
			.catch(() => setSends([]))
			.finally(() => setIsLoading(false));
	}, [address, publicClient]);

	useEffect(() => {
		fetchSends();
	}, [fetchSends]);

	return { sends, isLoading, refetch: fetchSends };
}
