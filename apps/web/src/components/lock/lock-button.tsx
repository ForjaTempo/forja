"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LoaderIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";

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

const goldButtonStyle: CSSProperties = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};

const goldButtonCls =
	"inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-[#1a1307] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";

const neutralButtonCls =
	"inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-6 py-3.5 font-medium text-[14px] text-text-secondary disabled:cursor-not-allowed";

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

	if (insufficientUsdc) {
		return (
			<button type="button" disabled className={neutralButtonCls}>
				Insufficient USDC
			</button>
		);
	}

	if (insufficientToken) {
		return (
			<button type="button" disabled className={neutralButtonCls}>
				Insufficient {tokenSymbol ?? "tokens"}
			</button>
		);
	}

	if (needsUsdcApproval) {
		const approving = isUsdcApproving || isUsdcApprovalConfirming;
		return (
			<button
				type="button"
				onClick={onApproveUsdc}
				disabled={approving}
				className={cn(goldButtonCls)}
				style={goldButtonStyle}
			>
				{approving && <LoaderIcon className="size-4 animate-spin" />}
				{isUsdcApproving
					? "Approving…"
					: isUsdcApprovalConfirming
						? "Confirming…"
						: "Approve USDC fee (1/3)"}
			</button>
		);
	}

	if (needsTokenApproval) {
		const approving = isTokenApproving || isTokenApprovalConfirming;
		return (
			<button
				type="button"
				onClick={onApproveToken}
				disabled={approving}
				className={cn(goldButtonCls)}
				style={goldButtonStyle}
			>
				{approving && <LoaderIcon className="size-4 animate-spin" />}
				{isTokenApproving
					? "Approving…"
					: isTokenApprovalConfirming
						? "Confirming…"
						: `Approve ${tokenSymbol ?? "token"} (2/3)`}
			</button>
		);
	}

	const creating = isCreating || isConfirming;
	return (
		<button
			type="button"
			onClick={onCreateLock}
			disabled={disabled || creating}
			className={cn(goldButtonCls)}
			style={goldButtonStyle}
		>
			{creating && <LoaderIcon className="size-4 animate-spin" />}
			{isCreating ? "Waiting for approval…" : isConfirming ? "Forging lock…" : "Create lock (3/3)"}
		</button>
	);
}
