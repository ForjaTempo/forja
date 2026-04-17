import "server-only";
import { type Address, encodeAbiParameters, keccak256, type PublicClient } from "viem";
import { POOL_MANAGER_ADDRESS } from "../constants";
import { computePoolId, type PoolKey } from "./pool";

/**
 * v4 PoolManager exposes raw storage via `extsload(slot)` so off-chain code can
 * read pool state without each pool needing its own getter. We use this to
 * fetch slot0 (current price + tick) and liquidity for a candidate pool.
 *
 * Storage layout (PoolManager.sol → Pools.sol):
 *   mapping(PoolId => Pool.State) internal _pools;   // slot 6 in v4-core 1.0.x
 *   struct Pool.State {
 *     Slot0 slot0;            // slot 0 of struct
 *     uint256 feeGrowthGlobal0X128;
 *     uint256 feeGrowthGlobal1X128;
 *     uint128 liquidity;       // slot 3 of struct
 *     ...
 *   }
 *
 *   Slot0 packs (lower → upper bits):
 *     uint160 sqrtPriceX96
 *     int24   tick
 *     uint24  protocolFee
 *     uint24  lpFee
 */

/** Storage slot of `_pools` mapping inside PoolManager. */
const POOLS_MAPPING_SLOT = 6n;

const extsloadAbi = [
	{
		type: "function",
		name: "extsload",
		stateMutability: "view",
		inputs: [{ name: "slot", type: "bytes32" }],
		outputs: [{ name: "value", type: "bytes32" }],
	},
] as const;

function poolStateBaseSlot(poolId: `0x${string}`): bigint {
	const hash = keccak256(
		encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [poolId, POOLS_MAPPING_SLOT]),
	);
	return BigInt(hash);
}

function toBytes32(n: bigint): `0x${string}` {
	return `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`;
}

export type Slot0 = {
	sqrtPriceX96: bigint;
	tick: number;
	protocolFee: number;
	lpFee: number;
};

function decodeSlot0(raw: bigint): Slot0 {
	const sqrtPriceX96 = raw & ((1n << 160n) - 1n);
	const tickRaw = (raw >> 160n) & ((1n << 24n) - 1n);
	const protocolFee = Number((raw >> 184n) & ((1n << 24n) - 1n));
	const lpFee = Number((raw >> 208n) & ((1n << 24n) - 1n));

	// Sign-extend the 24-bit tick.
	const tick = tickRaw >= 1n << 23n ? Number(tickRaw - (1n << 24n)) : Number(tickRaw);

	return { sqrtPriceX96, tick, protocolFee, lpFee };
}

export type PoolState = {
	exists: boolean;
	slot0: Slot0;
	liquidity: bigint;
};

/**
 * Read the on-chain state for a v4 pool. `exists = false` when the pool has
 * never been initialised (sqrtPriceX96 == 0).
 */
export async function readPoolState(
	client: PublicClient,
	key: PoolKey,
	poolManager: Address = POOL_MANAGER_ADDRESS,
): Promise<PoolState> {
	const poolId = computePoolId(key);
	const base = poolStateBaseSlot(poolId);

	const [slot0Raw, liquidityRaw] = await Promise.all([
		client.readContract({
			address: poolManager,
			abi: extsloadAbi,
			functionName: "extsload",
			args: [toBytes32(base)],
		}),
		client.readContract({
			address: poolManager,
			abi: extsloadAbi,
			functionName: "extsload",
			args: [toBytes32(base + 3n)],
		}),
	]);

	const slot0 = decodeSlot0(BigInt(slot0Raw));
	const liquidity = BigInt(liquidityRaw) & ((1n << 128n) - 1n);

	return {
		exists: slot0.sqrtPriceX96 > 0n,
		slot0,
		liquidity,
	};
}
