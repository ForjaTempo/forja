"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface CtaProps {
	uniqueCreators?: number;
}

export function Cta({ uniqueCreators }: CtaProps) {
	return (
		<section className="relative isolate overflow-hidden py-20 sm:py-24">
			{/* Subtle radial glow */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-indigo/6 blur-[100px]" />
			</div>

			<div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
				<ScrollReveal>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to forge?</h2>
					<p className="mt-4 text-base text-smoke-dark sm:text-lg">
						{uniqueCreators && uniqueCreators > 0
							? `Join ${uniqueCreators} creator${uniqueCreators !== 1 ? "s" : ""} building on Tempo.`
							: "Connect your wallet and start building on Tempo."}
					</p>
					<div className="mt-8 flex justify-center">
						<ConnectButton />
					</div>
				</ScrollReveal>
			</div>
		</section>
	);
}
