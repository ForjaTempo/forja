"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LoaderIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";

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

const goldButtonStyle: CSSProperties = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};

const goldButtonCls =
	"inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-[#1a1307] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";

const neutralButtonCls =
	"inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-6 py-3.5 font-medium text-[14px] text-text-secondary disabled:cursor-not-allowed";

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
					<button
						type="button"
						className={goldButtonCls}
						style={goldButtonStyle}
						onClick={openConnectModal}
					>
						Connect wallet
					</button>
				)}
			</ConnectButton.Custom>
		);
	}

	if (isAllowanceLoading) {
		return (
			<button type="button" disabled className={neutralButtonCls}>
				<LoaderIcon className="size-4 animate-spin" />
				Checking allowance…
			</button>
		);
	}

	if (insufficientBalance) {
		return (
			<button type="button" disabled className={neutralButtonCls}>
				Insufficient USDC
			</button>
		);
	}

	if (needsApproval) {
		const approving = isApproving || isApprovalConfirming;
		return (
			<button
				type="button"
				onClick={onApprove}
				disabled={approving}
				className={cn(goldButtonCls)}
				style={goldButtonStyle}
			>
				{approving && <LoaderIcon className="size-4 animate-spin" />}
				{isApproving ? "Approving…" : isApprovalConfirming ? "Confirming…" : "Approve USDC"}
			</button>
		);
	}

	const creating = isCreating || isConfirming;
	return (
		<button
			type="button"
			onClick={onCreate}
			disabled={disabled || creating}
			className={cn(goldButtonCls)}
			style={goldButtonStyle}
		>
			{creating && <LoaderIcon className="size-4 animate-spin" />}
			{isCreating ? "Waiting for approval…" : isConfirming ? "Forging…" : "Create token"}
		</button>
	);
}
