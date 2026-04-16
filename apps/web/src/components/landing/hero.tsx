import { ArrowRightIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
	return (
		<section className="relative isolate overflow-hidden py-24 sm:py-32 lg:py-40">
			{/* Radial indigo glow behind heading */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo/8 blur-[120px] animate-pulse-glow" />
			</div>

			<div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
				<h1 className="animate-fade-in text-6xl font-extrabold tracking-tighter sm:text-7xl lg:text-8xl">
					<span className="bg-gradient-to-b from-steel-white to-smoke bg-clip-text text-transparent">
						FOR
					</span>
					<span className="bg-gradient-to-b from-indigo to-indigo-hover bg-clip-text text-transparent">
						JA
					</span>
				</h1>

				<p
					className="animate-fade-in-up mt-4 font-mono text-lg tracking-widest text-smoke sm:text-xl"
					style={{ animationDelay: "0.15s" }}
				>
					Create. Send. Lock. Claim. Launch.
				</p>

				<p
					className="animate-fade-in-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-smoke-dark sm:text-lg"
					style={{ animationDelay: "0.3s" }}
				>
					The all-in-one token platform for Tempo. Create TIP-20 tokens, distribute to thousands,
					lock liquidity, run claims, and launch with bonding curves — all on-chain.
				</p>

				<div
					className="animate-fade-in-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
					style={{ animationDelay: "0.45s" }}
				>
					<Button asChild size="lg" className="h-12 gap-2 px-8 text-base font-semibold">
						<Link href="/create">
							Launch App
							<ArrowRightIcon className="size-4" />
						</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						size="lg"
						className="h-12 gap-2 px-8 text-base font-semibold"
					>
						<Link href="/tokens">
							<SearchIcon className="size-4" />
							Explore Tokens
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
