"use client";

import { AlertTriangleIcon } from "lucide-react";

interface TerminatedBannerProps {
	reason: "killed" | "failed";
}

export function TerminatedBanner({ reason }: TerminatedBannerProps) {
	const scrollToTrade = () => {
		if (typeof window === "undefined") return;
		const el = document.getElementById("trade-panel-anchor");
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const isKilled = reason === "killed";
	const title = isKilled ? "This launch has been terminated." : "This launch failed to graduate.";
	const description = isKilled
		? "The creator stopped this launch. You can sell your remaining tokens to exit."
		: "The bonding curve timed out before reaching graduation. You can sell your remaining tokens to exit.";

	return (
		<div
			className="reveal relative overflow-hidden rounded-2xl border border-red/25 p-6 sm:p-8"
			style={{
				background:
					"linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.02) 60%, transparent)",
			}}
		>
			<div
				aria-hidden
				className="-top-24 -right-24 pointer-events-none absolute size-64 blur-3xl"
				style={{ background: "radial-gradient(circle, rgba(248,113,113,0.25), transparent 70%)" }}
			/>
			<div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex items-start gap-4">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red/30 bg-red/10 text-red">
						<AlertTriangleIcon className="size-5" />
					</div>
					<div>
						<div className="font-mono text-[11px] text-red uppercase tracking-[0.2em]">
							{isKilled ? "Killed" : "Failed"}
						</div>
						<h2 className="mt-1 font-display text-[26px] leading-[1.1] tracking-[-0.02em] text-text-primary">
							{title}
						</h2>
						<p className="mt-2 text-[13.5px] text-text-secondary">{description}</p>
					</div>
				</div>

				<button
					type="button"
					onClick={scrollToTrade}
					className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 font-medium text-[13px] text-red transition-colors hover:border-red/60 hover:bg-red/20"
				>
					Sell remaining tokens
				</button>
			</div>
		</div>
	);
}
