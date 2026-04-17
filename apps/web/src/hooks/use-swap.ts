"use client";

import { useCallback, useState } from "react";
import { type Hex, isAddress } from "viem";
import {
	useAccount,
	useChainId,
	useSignTypedData,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import type { SerializedSwapQuote } from "@/actions/swaps";
import { PERMIT2_ADDRESS } from "@/lib/constants";
import { swapRouterConfig } from "@/lib/contracts";

const PERMIT2_DOMAIN_NAME = "Permit2";

const PERMIT_TRANSFER_FROM_TYPES = {
	PermitTransferFrom: [
		{ name: "permitted", type: "TokenPermissions" },
		{ name: "spender", type: "address" },
		{ name: "nonce", type: "uint256" },
		{ name: "deadline", type: "uint256" },
	],
	TokenPermissions: [
		{ name: "token", type: "address" },
		{ name: "amount", type: "uint256" },
	],
} as const;

interface UseSwapReturn {
	swap: (quote: SerializedSwapQuote, deadlineSec: number) => Promise<void>;
	isSigning: boolean;
	isSwapping: boolean;
	isConfirming: boolean;
	isConfirmed: boolean;
	txHash: Hex | undefined;
	error: Error | null;
	reset: () => void;
}

/**
 * Two-step swap orchestrator:
 *   1. Wallet signs an EIP-712 PermitTransferFrom for Permit2 (no gas).
 *   2. Wallet submits ForjaSwapRouter.swapExactInputSingle with that signature.
 *
 * The router checks `permit.permitted.token == tokenIn` and
 * `permit.permitted.amount == amountIn` before pulling funds — so a malformed
 * signature reverts cleanly instead of draining anything.
 */
export function useSwap(): UseSwapReturn {
	const { address } = useAccount();
	const chainId = useChainId();
	const { signTypedDataAsync } = useSignTypedData();
	const [isSigning, setIsSigning] = useState(false);
	const [signError, setSignError] = useState<Error | null>(null);

	const {
		writeContractAsync,
		data: txHash,
		isPending: isSwapping,
		error: writeError,
		reset: resetWrite,
	} = useWriteContract();

	const {
		isLoading: isConfirming,
		isSuccess: isConfirmed,
		error: receiptError,
	} = useWaitForTransactionReceipt({ hash: txHash });

	const swap = useCallback(
		async (quote: SerializedSwapQuote, deadlineSec: number) => {
			if (!address) throw new Error("Wallet not connected");
			if (!isAddress(swapRouterConfig.address)) {
				throw new Error("Swap router not configured");
			}

			setSignError(null);
			setIsSigning(true);

			let signature: Hex;
			let nonce: bigint;
			let deadline: bigint;
			try {
				// Unordered nonce: 192 bits of timestamp + 64 bits of randomness.
				// Permit2 stores nonces as a 256-bit bitmap so any unique value works.
				const randHi = BigInt(Math.floor(Math.random() * 0xffff_ffff));
				const randLo = BigInt(Math.floor(Math.random() * 0xffff_ffff));
				nonce = (BigInt(Date.now()) << 64n) | (randHi << 32n) | randLo;
				deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSec);

				signature = await signTypedDataAsync({
					domain: {
						name: PERMIT2_DOMAIN_NAME,
						chainId,
						verifyingContract: PERMIT2_ADDRESS,
					},
					types: PERMIT_TRANSFER_FROM_TYPES,
					primaryType: "PermitTransferFrom",
					message: {
						permitted: {
							token: quote.tokenIn as `0x${string}`,
							amount: BigInt(quote.amountIn),
						},
						spender: swapRouterConfig.address,
						nonce,
						deadline,
					},
				});
			} catch (e) {
				const err = e instanceof Error ? e : new Error("Signature rejected");
				setSignError(err);
				setIsSigning(false);
				throw err;
			} finally {
				setIsSigning(false);
			}

			await writeContractAsync({
				address: swapRouterConfig.address,
				abi: swapRouterConfig.abi,
				functionName: "swapExactInputSingle",
				args: [
					{
						poolKey: {
							currency0: quote.poolKey.currency0 as `0x${string}`,
							currency1: quote.poolKey.currency1 as `0x${string}`,
							fee: quote.poolKey.fee,
							tickSpacing: quote.poolKey.tickSpacing,
							hooks: quote.poolKey.hooks as `0x${string}`,
						},
						zeroForOne: quote.zeroForOne,
						amountIn: BigInt(quote.amountIn),
						minAmountOut: BigInt(quote.minAmountOut),
						sqrtPriceLimitX96: BigInt(quote.sqrtPriceLimitX96),
						deadline,
						hookData: "0x",
					},
					{
						permitted: {
							token: quote.tokenIn as `0x${string}`,
							amount: BigInt(quote.amountIn),
						},
						nonce,
						deadline,
					},
					signature,
				],
			});
		},
		[address, chainId, signTypedDataAsync, writeContractAsync],
	);

	const reset = useCallback(() => {
		setSignError(null);
		resetWrite();
	}, [resetWrite]);

	return {
		swap,
		isSigning,
		isSwapping,
		isConfirming,
		isConfirmed,
		txHash,
		error: signError ?? writeError ?? receiptError ?? null,
		reset,
	};
}
