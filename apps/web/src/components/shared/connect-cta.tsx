"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

const goldStyle: CSSProperties = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};

interface ConnectCtaProps {
	className?: string;
	label?: ReactNode;
	/** 'gold' (default, primary CTA) or 'outline' (secondary surfaces) */
	variant?: "gold" | "outline";
	/** Full-width or inline */
	fullWidth?: boolean;
}

/**
 * Shared "Connect wallet" CTA — the ONLY place in the app that should call
 * RainbowKit's openConnectModal. All tool pages (create / lock / multisend /
 * launch / trade) import this instead of wrapping their own
 * ConnectButton.Custom, so the pre-modal look-and-feel stays consistent and
 * we have one file to edit when the connect UX changes.
 *
 * Per RainbowKit docs, the recommended customization pattern is to place
 * your own styled CTA in front of the wallet modal rather than restyling
 * the modal internals: https://github.com/rainbow-me/rainbowkit/discussions/979
 */
export function ConnectCta({
	className,
	label = "Connect wallet",
	variant = "gold",
	fullWidth = true,
}: ConnectCtaProps) {
	const { openConnectModal } = useConnectModal();

	const base =
		"inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[15px] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";
	const width = fullWidth ? "w-full" : "";

	if (variant === "gold") {
		return (
			<button
				type="button"
				onClick={openConnectModal}
				className={`${base} ${width} text-[#1a1307] ${className ?? ""}`.trim()}
				style={goldStyle}
			>
				<WalletIcon className="size-4" />
				{label}
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={openConnectModal}
			className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-3 font-medium text-[13.5px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary ${width} ${className ?? ""}`.trim()}
		>
			<WalletIcon className="size-4" />
			{label}
		</button>
	);
}
