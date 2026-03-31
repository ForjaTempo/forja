"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LoaderIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";

interface CreateButtonProps {
	needsApproval: boolean;
	isAllowanceLoading: boolean;
	insufficientBalance: boolean;
	isApproving: boolean;
	isApprovalConfirming: boolean;
	isCreating: boolean;
	isConfirming: boolean;
	disabled: boolean;
	onApprove: () => void;
	onCreate: () => void;
}

export function CreateButton({
	needsApproval,
	isAllowanceLoading,
	insufficientBalance,
	isApproving,
	isApprovalConfirming,
	isCreating,
	isConfirming,
	disabled,
	onApprove,
	onCreate,
}: CreateButtonProps) {
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

	if (insufficientBalance) {
		return (
			<Button className="w-full" size="lg" disabled>
				Insufficient USDC
			</Button>
		);
	}

	if (needsApproval) {
		const approving = isApproving || isApprovalConfirming;
		return (
			<Button className="w-full" size="lg" onClick={onApprove} disabled={approving}>
				{approving && <LoaderIcon className="size-4 animate-spin" />}
				{isApproving ? "Approving..." : isApprovalConfirming ? "Confirming..." : "Approve USDC"}
			</Button>
		);
	}

	const creating = isCreating || isConfirming;
	return (
		<Button className="w-full" size="lg" onClick={onCreate} disabled={disabled || creating}>
			{creating && <LoaderIcon className="size-4 animate-spin" />}
			{isCreating ? "Waiting for approval..." : isConfirming ? "Creating..." : "Create Token"}
		</Button>
	);
}
