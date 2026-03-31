"use client";

import { useCallback, useMemo } from "react";
import type { Hex } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { lockerConfig } from "@/lib/contracts";
import type { LockData } from "@/lib/lock-utils";

interface UseUserLocksReturn {
	createdLocks: LockData[];
	beneficiaryLocks: LockData[];
	isLoading: boolean;
	refetch: () => void;
}

export function useUserLocks(): UseUserLocksReturn {
	const { address } = useAccount();

	const {
		data: creatorIds,
		isLoading: isCreatorLoading,
		refetch: refetchCreatorIds,
	} = useReadContract({
		...lockerConfig,
		functionName: "getLocksByCreator",
		args: address ? [address] : undefined,
		query: { enabled: !!address },
	});

	const {
		data: beneficiaryIds,
		isLoading: isBeneficiaryLoading,
		refetch: refetchBeneficiaryIds,
	} = useReadContract({
		...lockerConfig,
		functionName: "getLocksByBeneficiary",
		args: address ? [address] : undefined,
		query: { enabled: !!address },
	});

	// Deduplicate lock IDs
	const allIds = useMemo(() => {
		const set = new Set<bigint>();
		for (const id of creatorIds ?? []) set.add(id);
		for (const id of beneficiaryIds ?? []) set.add(id);
		return [...set];
	}, [creatorIds, beneficiaryIds]);

	// Batch-read all lock structs
	const {
		data: lockResults,
		isLoading: isLocksLoading,
		refetch: refetchLocks,
	} = useReadContracts({
		contracts: allIds.map((id) => ({
			...lockerConfig,
			functionName: "locks" as const,
			args: [id] as const,
		})),
		query: { enabled: allIds.length > 0 },
	});

	// Parse lock structs into LockData
	const allLocks = useMemo<LockData[]>(() => {
		if (!lockResults) return [];
		return lockResults
			.map((result, i) => {
				const id = allIds[i];
				if (result.status !== "success" || !result.result || id === undefined) return null;
				const r = result.result as [
					Hex,
					Hex,
					Hex,
					bigint,
					bigint,
					bigint,
					bigint,
					bigint,
					boolean,
					boolean,
					boolean,
				];
				return {
					lockId: id,
					token: r[0],
					creator: r[1],
					beneficiary: r[2],
					totalAmount: r[3],
					claimedAmount: r[4],
					startTime: r[5],
					endTime: r[6],
					cliffDuration: r[7],
					vestingEnabled: r[8],
					revocable: r[9],
					revoked: r[10],
				} satisfies LockData;
			})
			.filter((l): l is LockData => l !== null);
	}, [lockResults, allIds]);

	const creatorSet = useMemo(() => new Set(creatorIds?.map(Number) ?? []), [creatorIds]);
	const beneficiarySet = useMemo(
		() => new Set(beneficiaryIds?.map(Number) ?? []),
		[beneficiaryIds],
	);

	// Newest first (highest lockId first)
	const createdLocks = useMemo(
		() =>
			allLocks
				.filter((l) => creatorSet.has(Number(l.lockId)))
				.sort((a, b) => (b.lockId > a.lockId ? 1 : -1)),
		[allLocks, creatorSet],
	);

	const beneficiaryLocks = useMemo(
		() =>
			allLocks
				.filter((l) => beneficiarySet.has(Number(l.lockId)))
				.sort((a, b) => (b.lockId > a.lockId ? 1 : -1)),
		[allLocks, beneficiarySet],
	);

	const refetch = useCallback(() => {
		refetchCreatorIds();
		refetchBeneficiaryIds();
		refetchLocks();
	}, [refetchCreatorIds, refetchBeneficiaryIds, refetchLocks]);

	return {
		createdLocks,
		beneficiaryLocks,
		isLoading: isCreatorLoading || isBeneficiaryLoading || isLocksLoading,
		refetch,
	};
}
