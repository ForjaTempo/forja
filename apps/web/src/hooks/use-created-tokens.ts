"use client";

import { useEffect, useState } from "react";
import type { Hex, Log } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { tokenFactoryConfig } from "@/lib/contracts";

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
}

export function useCreatedTokens(): {
	tokens: CreatedTokenEvent[];
	isLoading: boolean;
} {
	const { address } = useAccount();
	const publicClient = usePublicClient();
	const [tokens, setTokens] = useState<CreatedTokenEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!address || !publicClient) {
			setTokens([]);
			return;
		}

		let cancelled = false;
		setIsLoading(true);

		publicClient
			.getLogs({
				address: tokenFactoryConfig.address,
				event: TOKEN_CREATED_EVENT,
				args: { creator: address },
				fromBlock: 0n,
				toBlock: "latest",
			})
			.then((logs: Log[]) => {
				if (cancelled) return;
				const parsed: CreatedTokenEvent[] = logs
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
				setTokens(parsed);
			})
			.catch(() => {
				if (!cancelled) setTokens([]);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [address, publicClient]);

	return { tokens, isLoading };
}
