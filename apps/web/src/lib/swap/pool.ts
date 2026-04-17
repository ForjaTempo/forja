import { type Address, encodeAbiParameters, keccak256 } from "viem";

/**
 * Uniswap v4 PoolKey — identifies a pool inside the singleton PoolManager.
 * `currency0` MUST be the lexicographically smaller address; v4 enforces this
 * at pool initialisation.
 */
export type PoolKey = {
	currency0: Address;
	currency1: Address;
	fee: number;
	tickSpacing: number;
	hooks: Address;
};

/**
 * Sort two token addresses into v4's canonical (currency0, currency1) order.
 * Returns the sorted pair plus a `swapped` flag the caller can use to flip
 * `zeroForOne` if their semantic input/output is reversed by the sort.
 */
export function sortCurrencies(
	tokenA: Address,
	tokenB: Address,
): { currency0: Address; currency1: Address; swapped: boolean } {
	const a = tokenA.toLowerCase();
	const b = tokenB.toLowerCase();
	if (a === b) {
		throw new Error("Cannot sort identical currencies");
	}
	const swapped = a > b;
	return swapped
		? { currency0: tokenB, currency1: tokenA, swapped: true }
		: { currency0: tokenA, currency1: tokenB, swapped: false };
}

/**
 * Compute Uniswap v4 pool ID. v4 keys pools by `keccak256(abi.encode(PoolKey))`
 * (NOT a packed encoding — the SDK uses standard ABI encoding here).
 */
export function computePoolId(key: PoolKey): `0x${string}` {
	return keccak256(
		encodeAbiParameters(
			[
				{
					type: "tuple",
					components: [
						{ name: "currency0", type: "address" },
						{ name: "currency1", type: "address" },
						{ name: "fee", type: "uint24" },
						{ name: "tickSpacing", type: "int24" },
						{ name: "hooks", type: "address" },
					],
				},
			],
			[key],
		),
	);
}

/**
 * Standard fee tiers we probe when looking for liquidity. v4 supports
 * arbitrary tiers but the vast majority of liquidity sits in these three.
 * tickSpacing follows Uniswap's canonical mapping.
 */
export const STANDARD_FEE_TIERS: ReadonlyArray<{ fee: number; tickSpacing: number }> = [
	{ fee: 500, tickSpacing: 10 }, // 0.05%
	{ fee: 3000, tickSpacing: 60 }, // 0.30%
	{ fee: 10_000, tickSpacing: 200 }, // 1.00%
];

/**
 * Build a candidate PoolKey for a given pair + fee tier with no hook attached.
 * Tempo's enshrined-DEX hook routing is transparent — pools are still
 * discoverable via the no-hook key and the hook is consulted by PoolManager.
 */
export function buildPoolKey(
	tokenA: Address,
	tokenB: Address,
	fee: number,
	tickSpacing: number,
	hooks: Address = "0x0000000000000000000000000000000000000000",
): { key: PoolKey; zeroForOneIfInputIsTokenA: boolean } {
	const { currency0, currency1, swapped } = sortCurrencies(tokenA, tokenB);
	return {
		key: { currency0, currency1, fee, tickSpacing, hooks },
		// If the sort swapped (tokenA became currency1), then a swap *from* tokenA
		// is currency1 → currency0, which is `zeroForOne = false`.
		zeroForOneIfInputIsTokenA: !swapped,
	};
}
