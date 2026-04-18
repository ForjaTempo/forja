"use client";

import Link from "next/link";

export function Cta() {
	return (
		<section className="px-6 pt-20 pb-16 lg:px-10">
			<div className="mx-auto max-w-[1200px]">
				<div
					className="reveal relative overflow-hidden rounded-[28px] border border-border-gold px-16 py-20 text-center"
					style={{
						background: "linear-gradient(135deg, #1a1307 0%, #0b0b10 40%)",
					}}
				>
					<div
						aria-hidden
						className="-top-52 -translate-x-1/2 absolute left-1/2 h-[400px] w-[800px] blur-3xl"
						style={{
							background: "radial-gradient(ellipse, rgba(240,211,138,0.5), transparent 70%)",
						}}
					/>
					<div className="relative">
						<div className="mb-5 font-mono text-[11px] text-gold uppercase tracking-[0.25em]">
							Ready when you are
						</div>
						<h2 className="m-0 mb-7 font-display font-normal text-[clamp(44px,7vw,96px)] leading-[1] tracking-[-0.04em]">
							The forge is <span className="gold-text italic">hot.</span>
						</h2>
						<p className="mx-auto mb-10 max-w-[540px] text-[18px] text-text-secondary leading-[1.5]">
							Connect a wallet, pick a tool, ship a token in the next minute.
						</p>
						<Link
							href="/create"
							className="inline-flex items-center gap-2.5 rounded-[14px] px-7 py-4 font-semibold text-[#1a1307] text-[16px] transition-transform hover:-translate-y-0.5"
							style={{
								background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
								boxShadow: "0 6px 40px rgba(240,211,138,0.35)",
							}}
						>
							Launch the app →
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
