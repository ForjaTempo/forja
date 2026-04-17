import { AnimatedCounter } from "@/components/ui/animated-counter";

interface HeroStatsProps {
	tokensCreated: number;
	launchesCount: number;
	uniqueCreators: number;
}

export function HeroStats({ tokensCreated, launchesCount, uniqueCreators }: HeroStatsProps) {
	const stats = [
		{ label: "Tokens Created", value: tokensCreated },
		{ label: "Launches", value: launchesCount },
		{ label: "Creators", value: uniqueCreators },
	];

	return (
		<section className="border-t border-anvil-gray-light/40">
			<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid grid-cols-3 gap-4 text-center">
					{stats.map((stat) => (
						<div key={stat.label}>
							<p className="font-mono text-2xl font-bold text-indigo sm:text-3xl">
								<AnimatedCounter value={stat.value} />
							</p>
							<p className="mt-1 text-xs text-smoke-dark sm:text-sm">{stat.label}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
