"use client";

import { AlertTriangleIcon } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface TerminatedBannerProps {
	reason: "killed" | "failed";
}

export function TerminatedBanner({ reason }: TerminatedBannerProps) {
	const scrollToTrade = () => {
		if (typeof window === "undefined") return;
		const el = document.getElementById("trade-panel-anchor");
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const isKilled = reason === "killed";
	const title = isKilled ? "This launch has been terminated" : "This launch has failed";
	const description = isKilled
		? "The creator stopped this launch. You can sell your remaining tokens to exit."
		: "This launch timed out before reaching graduation. You can sell your remaining tokens to exit.";

	return (
		<ScrollReveal>
			<div className="overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-5 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
							<AlertTriangleIcon className="size-5" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-red-400">{title}</h2>
							<p className="mt-1 text-sm text-smoke">{description}</p>
						</div>
					</div>

					<button
						type="button"
						onClick={scrollToTrade}
						className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/20"
					>
						Sell Remaining Tokens
					</button>
				</div>
			</div>
		</ScrollReveal>
	);
}
