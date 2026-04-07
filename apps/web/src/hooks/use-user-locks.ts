"use client";

import { useCallback, useMemo } from "react";
import type { Hex } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { hasLockerV2, lockerConfig, lockerV2Config } from "@/lib/contracts";
import type { LockData, LockSource } from "@/lib/lock-utils";

interface UseUserLocksReturn {
	createdLocks: LockData[];
	beneficiaryLocks: LockData[];
	isLoading: boolean;
	refetch: () => void;
}

type LockRole = "creator" | "beneficiary";

interface LockEntry {
	id: bigint;
	source: LockSource;
	roles: Set<LockRole>;
}

function mergeEntries(
	entries: Map<string, LockEntry>,
	ids: readonly bigint[] | undefined,
	source: LockSource,
	role: LockRole,
) {
	for (const id of ids ?? []) {
		const key = `${source}:${id}`;
		const existing = entries.get(key);
		if (existing) {
			existing.roles.add(role);
		} else {
			entries.set(key, { id, source, roles: new Set([role]) });
		}
	}
}

export function useUserLocks(): UseUserLocksReturn {
	const { address } = useAccount();

	// V1 reads
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

	// V2 reads (only if V2 is deployed)
	const {
		data: creatorIdsV2,
		isLoading: isCreatorLoadingV2,
		refetch: refetchCreatorIdsV2,
	} = useReadContract({
		...lockerV2Config,
		functionName: "getLocksByCreator",
		args: address ? [address] : undefined,
		query: { enabled: !!address && hasLockerV2 },
	});

	const {
		data: beneficiaryIdsV2,
		isLoading: isBeneficiaryLoadingV2,
		refetch: refetchBeneficiaryIdsV2,
	} = useReadContract({
		...lockerV2Config,
		functionName: "getLocksByBeneficiary",
		args: address ? [address] : undefined,
		query: { enabled: !!address && hasLockerV2 },
	});

	// Merge V1 + V2 lock IDs with source + role tracking (deduped; a lock can be both creator & beneficiary)
	const allEntries = useMemo<LockEntry[]>(() => {
		const map = new Map<string, LockEntry>();
		mergeEntries(map, creatorIds, "v1", "creator");
		mergeEntries(map, beneficiaryIds, "v1", "beneficiary");
		mergeEntries(map, creatorIdsV2, "v2", "creator");
		mergeEntries(map, beneficiaryIdsV2, "v2", "beneficiary");
		return Array.from(map.values());
	}, [creatorIds, beneficiaryIds, creatorIdsV2, beneficiaryIdsV2]);

	// Batch-read all lock structs
	const {
		data: lockResults,
		isLoading: isLocksLoading,
		refetch: refetchLocks,
	} = useReadContracts({
		contracts: allEntries.map((entry) => ({
			...(entry.source === "v1" ? lockerConfig : lockerV2Config),
			functionName: "locks" as const,
			args: [entry.id] as const,
		})),
		query: { enabled: allEntries.length > 0 },
	});

	// Parse lock structs into LockData — keep role info paired with each lock so failed reads can't shift indices
	const pairedLocks = useMemo<Array<{ lock: LockData; roles: Set<LockRole> }>>(() => {
		if (!lockResults) return [];
		const out: Array<{ lock: LockData; roles: Set<LockRole> }> = [];
		for (let i = 0; i < lockResults.length; i++) {
			const result = lockResults[i];
			const entry = allEntries[i];
			if (!result || !entry) continue;
			if (result.status !== "success" || !result.result) continue;
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
			out.push({
				lock: {
					lockId: entry.id,
					source: entry.source,
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
				} satisfies LockData,
				roles: entry.roles,
			});
		}
		return out;
	}, [lockResults, allEntries]);

	// Sort by real creation time (startTime DESC) — V1 and V2 use independent lockId counters,
	// so lockId ordering is not meaningful across contracts. Tiebreak by source + lockId for stability.
	const sortedLocks = useMemo(() => {
		return [...pairedLocks].sort((a, b) => {
			if (b.lock.startTime !== a.lock.startTime) {
				return b.lock.startTime > a.lock.startTime ? 1 : -1;
			}
			if (a.lock.source !== b.lock.source) {
				return a.lock.source === "v2" ? -1 : 1; // V2 before V1 on ties
			}
			return b.lock.lockId > a.lock.lockId ? 1 : -1;
		});
	}, [pairedLocks]);

	const createdLocks = useMemo(
		() => sortedLocks.filter((p) => p.roles.has("creator")).map((p) => p.lock),
		[sortedLocks],
	);

	const beneficiaryLocks = useMemo(
		() => sortedLocks.filter((p) => p.roles.has("beneficiary")).map((p) => p.lock),
		[sortedLocks],
	);

	const refetch = useCallback(() => {
		refetchCreatorIds();
		refetchBeneficiaryIds();
		refetchLocks();
		if (hasLockerV2) {
			refetchCreatorIdsV2();
			refetchBeneficiaryIdsV2();
		}
	}, [
		refetchCreatorIds,
		refetchBeneficiaryIds,
		refetchLocks,
		refetchCreatorIdsV2,
		refetchBeneficiaryIdsV2,
	]);

	return {
		createdLocks,
		beneficiaryLocks,
		isLoading:
			isCreatorLoading ||
			isBeneficiaryLoading ||
			isLocksLoading ||
			(hasLockerV2 && (isCreatorLoadingV2 || isBeneficiaryLoadingV2)),
		refetch,
	};
}
