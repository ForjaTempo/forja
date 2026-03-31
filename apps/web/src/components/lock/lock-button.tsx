"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LoaderIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";

interface LockButtonProps {
	needsUsdcApproval: boolean;
	needsTokenApproval: boolean;
	isAllowanceLoading: boolean;
	insufficientUsdc: boolean;
	insufficientToken: boolean;
	isUsdcApproving: boolean;
	isUsdcApprovalConfirming: boolean;
	isTokenApproving: boolean;
	isTokenApprovalConfirming: boolean;
	isCreating: boolean;
	isConfirming: boolean;
	disabled: boolean;
	tokenSymbol: string | undefined;
	onApproveUsdc: () => void;
	onApproveToken: () => void;
	onCreateLock: () => void;
}

export function LockButton({
	needsUsdcApproval,
	needsTokenApproval,
	isAllowanceLoading,
	insufficientUsdc,
	insufficientToken,
	isUsdcApproving,
	isUsdcApprovalConfirming,
	isTokenApproving,
	isTokenApprovalConfirming,
	isCreating,
	isConfirming,
	disabled,
	tokenSymbol,
	onApproveUsdc,
	onApproveToken,
	onCreateLock,
}: LockButtonProps) {
	const { isConnected } = useAccount();

	if (!isConnected) {
		return (
			<ConnectButton.Custom>
				{({ openConnectModal }) => (
					<Button className="w-full" size="lg" onClick={openConnectModal}>
						Connect Wallet
					</Button>
				)}
			</ConnectButton.Custom>
		);
	}

	if (isAllowanceLoading) {
		return (
			<Button className="w-full" size="lg" disabled>
				<LoaderIcon className="size-4 animate-spin" />
				Checking allowance...
			</Button>
		);
	}

	if (insufficientUsdc) {
		return (
			<Button className="w-full" size="lg" disabled>
				Insufficient USDC
			</Button>
		);
	}

	if (insufficientToken) {
		return (
			<Button className="w-full" size="lg" disabled>
				Insufficient {tokenSymbol ?? "tokens"}
			</Button>
		);
	}

	if (needsUsdcApproval) {
		const approving = isUsdcApproving || isUsdcApprovalConfirming;
		return (
			<Button className="w-full" size="lg" onClick={onApproveUsdc} disabled={approving}>
				{approving && <LoaderIcon className="size-4 animate-spin" />}
				{isUsdcApproving
					? "Approving..."
					: isUsdcApprovalConfirming
						? "Confirming..."
						: "Approve USDC Fee (1/2)"}
			</Button>
		);
	}

	if (needsTokenApproval) {
		const approving = isTokenApproving || isTokenApprovalConfirming;
		return (
			<Button className="w-full" size="lg" onClick={onApproveToken} disabled={approving}>
				{approving && <LoaderIcon className="size-4 animate-spin" />}
				{isTokenApproving
					? "Approving..."
					: isTokenApprovalConfirming
						? "Confirming..."
						: `Approve ${tokenSymbol ?? "Token"} (2/2)`}
			</Button>
		);
	}

	const creating = isCreating || isConfirming;
	return (
		<Button className="w-full" size="lg" onClick={onCreateLock} disabled={disabled || creating}>
			{creating && <LoaderIcon className="size-4 animate-spin" />}
			{isCreating ? "Waiting for approval..." : isConfirming ? "Creating..." : "Create Lock"}
		</Button>
	);
}
