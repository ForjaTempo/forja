"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { type TransactionState, TransactionStatus } from "@/components/ui/transaction-status";
import { useCreateFee } from "@/hooks/use-create-fee";
import { useCreateToken } from "@/hooks/use-create-token";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useUsdcApproval } from "@/hooks/use-usdc-approval";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { TIP20_DECIMALS } from "@/lib/constants";
import { tokenFactoryConfig } from "@/lib/contracts";
import { CreateButton } from "./create-button";

const NAME_MAX = 50;
const SYMBOL_MAX = 10;

interface TokenFormProps {
	onSuccess?: (data: {
		name: string;
		symbol: string;
		txHash: string;
		tokenAddress: string;
	}) => void;
}

export function TokenForm({ onSuccess }: TokenFormProps) {
	const { isConnected } = useAccount();
	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [initialSupply, setInitialSupply] = useState("");
	const successFired = useRef(false);
	const [txDialogOpen, setTxDialogOpen] = useState(false);

	const { fee, formatted: feeFormatted } = useCreateFee();
	const { balance, formatted: balanceFormatted } = useUsdcBalance();
	const { txSubmitted, txFailed } = useTransactionToast();

	const feeAmount = fee ?? parseUnits(String(feeFormatted), TIP20_DECIMALS);

	const { needsApproval, isAllowanceLoading, approve, isApproving, isApprovalConfirming } =
		useUsdcApproval({
			spender: tokenFactoryConfig.address,
			amount: feeAmount,
		});

	const { createToken, isCreating, isConfirming, isSuccess, txHash, tokenAddress, error, reset } =
		useCreateToken();

	const insufficientBalance = balance !== undefined && balance < feeAmount;

	const nameError = name.length > NAME_MAX ? `Max ${NAME_MAX} characters` : "";
	const symbolError = symbol.length > SYMBOL_MAX ? `Max ${SYMBOL_MAX} characters` : "";
	const supplyError =
		initialSupply !== "" && (Number.isNaN(Number(initialSupply)) || Number(initialSupply) < 0)
			? "Must be a positive number"
			: "";
	const formValid =
		name.trim() !== "" && symbol.trim() !== "" && !nameError && !symbolError && !supplyError;

	const handleSymbolChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		setSymbol(e.target.value.toUpperCase());
	}, []);

	const handleCreate = useCallback(() => {
		if (!formValid) return;
		successFired.current = false;
		setTxDialogOpen(true);
		createToken(name.trim(), symbol.trim(), initialSupply || "0");
	}, [formValid, name, symbol, initialSupply, createToken]);

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			handleCreate();
		},
		[handleCreate],
	);

	// Derive TransactionStatus state
	let txState: TransactionState = "idle";
	if (isCreating) txState = "waiting";
	else if (isConfirming) txState = "pending";
	else if (isSuccess) txState = "confirmed";
	else if (error) txState = "failed";

	// Toast on tx submitted (hash received)
	useEffect(() => {
		if (txHash && isConfirming) {
			txSubmitted(txHash);
		}
	}, [txHash, isConfirming, txSubmitted]);

	// Toast on failure
	useEffect(() => {
		if (error) {
			txFailed(
				error.message?.includes("User rejected")
					? "Transaction rejected by user"
					: (error.message?.slice(0, 80) ?? "Transaction failed"),
			);
		}
	}, [error, txFailed]);

	// Notify parent on success
	useEffect(() => {
		if (isSuccess && txHash && tokenAddress && !successFired.current) {
			successFired.current = true;
			setTxDialogOpen(false);
			onSuccess?.({
				name: name.trim(),
				symbol: symbol.trim(),
				txHash,
				tokenAddress,
			});
		}
	}, [isSuccess, txHash, tokenAddress, onSuccess, name, symbol]);

	const handleRetry = useCallback(() => {
		reset();
		setTxDialogOpen(false);
		// Re-trigger after state clears
		setTimeout(() => handleCreate(), 0);
	}, [reset, handleCreate]);

	const handleTxDialogClose = useCallback(
		(open: boolean) => {
			if (!open) {
				setTxDialogOpen(false);
				if (error) reset();
			}
		},
		[error, reset],
	);

	return (
		<>
			<Card className="border-anvil-gray-light bg-deep-charcoal">
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<label htmlFor="token-name" className="text-sm font-medium text-smoke">
								Token Name
							</label>
							<Input
								id="token-name"
								placeholder="e.g. My Token"
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={NAME_MAX + 10}
								autoComplete="off"
							/>
							{nameError && <p className="text-xs text-ember-red">{nameError}</p>}
						</div>

						<div className="space-y-2">
							<label htmlFor="token-symbol" className="text-sm font-medium text-smoke">
								Token Symbol
							</label>
							<Input
								id="token-symbol"
								placeholder="e.g. MTK"
								value={symbol}
								onChange={handleSymbolChange}
								maxLength={SYMBOL_MAX + 5}
								autoComplete="off"
							/>
							{symbolError && <p className="text-xs text-ember-red">{symbolError}</p>}
						</div>

						<div className="space-y-2">
							<label htmlFor="token-supply" className="text-sm font-medium text-smoke">
								Initial Supply
							</label>
							<Input
								id="token-supply"
								type="text"
								inputMode="numeric"
								placeholder="0"
								value={initialSupply}
								onChange={(e) => setInitialSupply(e.target.value)}
								autoComplete="off"
							/>
							<p className="text-xs text-smoke-dark">
								Leave as 0 to create a token without initial mint
							</p>
							{supplyError && <p className="text-xs text-ember-red">{supplyError}</p>}
						</div>

						{name.trim() && symbol.trim() && (
							<>
								<Separator className="bg-anvil-gray-light" />
								<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
									<p className="mb-2 text-xs font-medium uppercase tracking-wider text-smoke-dark">
										Preview
									</p>
									<div className="space-y-1">
										<p className="text-sm text-smoke">
											<span className="text-smoke-dark">Name:</span> {name.trim()}
										</p>
										<p className="text-sm text-smoke">
											<span className="text-smoke-dark">Symbol:</span> {symbol.trim()}
										</p>
										<p className="text-sm text-smoke">
											<span className="text-smoke-dark">Supply:</span>{" "}
											{initialSupply
												? Number(initialSupply).toLocaleString("en-US")
												: "0 (no initial mint)"}
										</p>
									</div>
								</div>
							</>
						)}

						<Separator className="bg-anvil-gray-light" />

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-smoke-dark">Creation fee</span>
								<span className="font-mono text-smoke">{feeFormatted} USDC</span>
							</div>
							{isConnected && (
								<div className="flex items-center justify-between text-sm">
									<span className="text-smoke-dark">Your balance</span>
									<span className="font-mono text-smoke">
										{balanceFormatted !== undefined
											? `${Number.parseFloat(balanceFormatted).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`
											: "\u2014"}
									</span>
								</div>
							)}
							{insufficientBalance && (
								<p className="text-xs text-ember-red">
									Insufficient USDC balance to cover the creation fee
								</p>
							)}
						</div>

						<CreateButton
							needsApproval={needsApproval}
							isAllowanceLoading={isAllowanceLoading}
							insufficientBalance={insufficientBalance}
							isApproving={isApproving}
							isApprovalConfirming={isApprovalConfirming}
							isCreating={isCreating}
							isConfirming={isConfirming}
							disabled={!formValid}
							onApprove={approve}
							onCreate={handleCreate}
						/>
					</form>
				</CardContent>
			</Card>

			<TransactionStatus
				open={txDialogOpen && txState !== "idle"}
				onOpenChange={handleTxDialogClose}
				state={txState}
				txHash={txHash}
				title="Creating Token"
				onRetry={error ? handleRetry : undefined}
				error={
					error
						? error.message?.includes("User rejected")
							? "Transaction rejected by user"
							: (error.message?.slice(0, 120) ?? "Transaction failed")
						: undefined
				}
			/>
		</>
	);
}
