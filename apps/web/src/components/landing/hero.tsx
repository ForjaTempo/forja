import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
	return (
		<section className="relative isolate overflow-hidden py-24 sm:py-32 lg:py-40">
			{/* Radial amber glow behind heading */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-molten-amber/8 blur-[120px] animate-pulse-glow" />
			</div>

			{/* Subtle grid overlay */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
				style={{
					backgroundImage:
						"linear-gradient(rgba(245,158,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,.3) 1px, transparent 1px)",
					backgroundSize: "64px 64px",
				}}
			/>

			<div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
				<h1 className="animate-fade-in text-6xl font-extrabold tracking-tighter sm:text-7xl lg:text-8xl">
					<span className="bg-gradient-to-b from-steel-white to-smoke bg-clip-text text-transparent">
						FOR
					</span>
					<span className="bg-gradient-to-b from-molten-amber to-molten-amber-hover bg-clip-text text-transparent">
						JA
					</span>
				</h1>

				<p
					className="animate-fade-in-up mt-4 font-mono text-lg tracking-widest text-smoke sm:text-xl"
					style={{ animationDelay: "0.15s" }}
				>
					Create. Send. Lock.
				</p>

				<p
					className="animate-fade-in-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-smoke-dark sm:text-lg"
					style={{ animationDelay: "0.3s" }}
				>
					The no-code token toolkit for Tempo. Create TIP-20 tokens, distribute to thousands, and
					lock liquidity — all on-chain.
				</p>

				<div className="animate-fade-in-up mt-10" style={{ animationDelay: "0.45s" }}>
					<Button asChild size="lg" className="h-12 gap-2 px-8 text-base font-semibold">
						<Link href="/create">
							Launch App
							<ArrowRightIcon className="size-4" />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
