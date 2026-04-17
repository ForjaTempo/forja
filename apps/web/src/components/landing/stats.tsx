import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface StatsProps {
	tokensCreated: number;
	multisendCount: number;
	locksCreated: number;
	launchesCount: number;
}

const statConfig = [
	{ key: "tokensCreated", label: "Tokens Created" },
	{ key: "multisendCount", label: "Tokens Distributed" },
	{ key: "locksCreated", label: "Tokens Locked" },
	{ key: "launchesCount", label: "Launches" },
] as const;

export function Stats({ tokensCreated, multisendCount, locksCreated, launchesCount }: StatsProps) {
	const values: Record<string, number> = {
		tokensCreated,
		multisendCount,
		locksCreated,
		launchesCount,
	};

	return (
		<section className="border-y border-anvil-gray-light/40 bg-anvil-gray/30 py-16 sm:py-20">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<ScrollReveal>
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
						{statConfig.map((stat) => (
							<div key={stat.key} className="text-center">
								<p className="font-mono text-4xl font-bold text-indigo sm:text-5xl">
									<AnimatedCounter value={values[stat.key] ?? 0} />
								</p>
								<p className="mt-2 text-sm text-smoke-dark">{stat.label}</p>
							</div>
						))}
					</div>
				</ScrollReveal>
			</div>
		</section>
	);
}
