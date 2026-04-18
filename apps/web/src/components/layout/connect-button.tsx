"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangleIcon, WalletIcon } from "lucide-react";
import type { CSSProperties } from "react";

const goldStyle: CSSProperties = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 20px rgba(240,211,138,0.28), inset 0 1px 0 rgba(255,255,255,0.5)",
};

/**
 * Custom-rendered RainbowKit button so the connect flow fits the forge
 * visual language (gold CTA for not-connected, red-ghost for wrong-network,
 * hairline pill for connected). We still delegate modal/state to RainbowKit.
 */
export function ConnectButton() {
	return (
		<RainbowConnectButton.Custom>
			{({
				account,
				chain,
				openAccountModal,
				openChainModal,
				openConnectModal,
				authenticationStatus,
				mounted,
			}) => {
				const ready = mounted && authenticationStatus !== "loading";
				const connected =
					ready &&
					account &&
					chain &&
					(!authenticationStatus || authenticationStatus === "authenticated");

				return (
					<div
						aria-hidden={!ready}
						style={{
							opacity: ready ? 1 : 0,
							pointerEvents: ready ? "auto" : "none",
							userSelect: ready ? "auto" : "none",
						}}
					>
						{(() => {
							if (!connected) {
								return (
									<button
										type="button"
										onClick={openConnectModal}
										className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5 sm:px-5 sm:py-2.5 sm:text-[14px]"
										style={goldStyle}
									>
										<WalletIcon className="size-3.5 sm:size-4" />
										<span className="hidden sm:inline">Connect wallet</span>
										<span className="sm:hidden">Connect</span>
									</button>
								);
							}

							if (chain.unsupported) {
								return (
									<button
										type="button"
										onClick={openChainModal}
										className="inline-flex items-center gap-2 rounded-xl border border-red/40 bg-red/10 px-4 py-2 font-medium text-[13px] text-red transition-colors hover:bg-red/20 sm:px-4 sm:py-2.5"
									>
										<AlertTriangleIcon className="size-3.5" />
										Wrong network
									</button>
								);
							}

							// Balance display intentionally omitted: Tempo's native currency
							// config in wagmi returns NaN for many wallets, which rendered as
							// "NaN USD" in the pill. Account modal still shows full balance.
							return (
								<button
									type="button"
									onClick={openAccountModal}
									className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-3 py-1.5 font-medium text-[12.5px] text-text-secondary transition-colors hover:border-gold/40 hover:text-text-primary sm:px-3.5 sm:py-2 sm:text-[13px]"
								>
									<span
										aria-hidden
										className="size-1.5 rounded-full bg-green shadow-[0_0_6px_var(--color-green)]"
									/>
									<span className="font-mono">{account.displayName}</span>
								</button>
							);
						})()}
					</div>
				);
			}}
		</RainbowConnectButton.Custom>
	);
}
