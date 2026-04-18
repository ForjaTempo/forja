"use client";

import Link from "next/link";

const goldButtonStyle = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};

export default function ErrorPage({
	error: _error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
			<div className="mx-auto max-w-md space-y-4 text-center">
				<div className="inline-flex items-center gap-2.5 rounded-full border border-red/30 bg-red/10 py-1 pl-1 pr-3 font-mono text-[11px] text-red uppercase tracking-[0.18em]">
					<span className="rounded-sm bg-red px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#1a0606]">
						500
					</span>
					Error
				</div>
				<h1 className="font-display text-[42px] leading-[0.95] tracking-[-0.025em] text-text-primary sm:text-[56px]">
					Something <span className="gold-text italic">snapped.</span>
				</h1>
				<p className="text-[14px] text-text-secondary">
					The forge hit an unexpected bump. Try again — or head home.
				</p>
				<div className="mt-6 flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={reset}
						className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5"
						style={goldButtonStyle}
					>
						Try again
					</button>
					<Link
						href="/"
						className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-5 py-2.5 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
					>
						Go home
					</Link>
				</div>
			</div>
		</div>
	);
}
