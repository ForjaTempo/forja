import "server-only";
import type { Address, PublicClient } from "viem";

/** Tempo's enshrined stablecoin DEX precompile. Same address on all chains. */
export const STABLECOIN_DEX_ADDRESS = "0xDEc0000000000000000000000000000000000000" as const;

const stablecoinDexAbi = [
	{
		type: "function",
		name: "quoteSwapExactAmountIn",
		stateMutability: "view",
		inputs: [
			{ name: "tokenIn", type: "address" },
			{ name: "tokenOut", type: "address" },
			{ name: "amountIn", type: "uint128" },
		],
		outputs: [{ name: "amountOut", type: "uint128" }],
	},
] as const;

/**
 * Get an exact-input quote from Tempo's native stablecoin precompile. Returns
 * `null` when the precompile reverts (pair doesn't exist or orderbook can't
 * fill the input).
 */
export async function quoteStablecoinSwap(
	client: PublicClient,
	tokenIn: Address,
	tokenOut: Address,
	amountIn: bigint,
): Promise<bigint | null> {
	if (amountIn > (1n << 128n) - 1n) return null;
	try {
		const result = await client.readContract({
			address: STABLECOIN_DEX_ADDRESS,
			abi: stablecoinDexAbi,
			functionName: "quoteSwapExactAmountIn",
			args: [tokenIn, tokenOut, amountIn],
		});
		const out = BigInt(result);
		return out > 0n ? out : null;
	} catch {
		return null;
	}
}
