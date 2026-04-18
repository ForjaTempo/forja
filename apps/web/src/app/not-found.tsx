import Link from "next/link";

const navChipCls =
	"inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-elevated px-4 py-2.5 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary";

export default function NotFound() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
			<div className="mx-auto max-w-xl space-y-4 text-center">
				<div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(240,211,138,0.25)] bg-[rgba(240,211,138,0.08)] py-1 pl-1 pr-3 font-mono text-[11px] text-gold uppercase tracking-[0.18em]">
					<span className="rounded-sm bg-gold px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#1a1307]">
						404
					</span>
					Not found
				</div>
				<h1
					className="m-0 font-display font-normal leading-[0.95] tracking-[-0.03em]"
					style={{ fontSize: "clamp(48px, 8vw, 96px)" }}
				>
					This page <span className="gold-text italic">was never forged.</span>
				</h1>
				<p className="text-[14.5px] text-text-secondary">
					Head back to the forge — the anvil is still hot.
				</p>
				<nav className="mt-6 flex flex-wrap items-center justify-center gap-3">
					<Link
						href="/"
						className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5"
						style={{
							background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
							boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
						}}
					>
						Home
					</Link>
					<Link href="/create" className={navChipCls}>
						Create
					</Link>
					<Link href="/tokens" className={navChipCls}>
						Tokens
					</Link>
					<Link href="/dashboard" className={navChipCls}>
						Dashboard
					</Link>
				</nav>
			</div>
		</div>
	);
}
