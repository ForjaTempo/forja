"use client";

import { useQuery } from "@tanstack/react-query";
import { getGlobalStats } from "@/actions/stats";

const formatter = new Intl.NumberFormat("en-US");

const statLabels = [
	{ key: "tokensCreated", label: "Tokens Created" },
	{ key: "multisendCount", label: "Tokens Distributed" },
	{ key: "locksCreated", label: "Tokens Locked" },
] as const;

export function Stats() {
	const { data, isLoading } = useQuery({
		queryKey: ["global-stats"],
		queryFn: () => getGlobalStats(),
		staleTime: 60_000,
	});

	return (
		<section className="border-y border-anvil-gray-light/40 bg-anvil-gray/30 py-16 sm:py-20">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid gap-8 sm:grid-cols-3">
					{statLabels.map((stat) => (
						<div key={stat.key} className="text-center">
							<p className="font-mono text-4xl font-bold text-molten-amber sm:text-5xl">
								{isLoading ? (
									<span className="inline-block h-12 w-20 animate-pulse rounded bg-anvil-gray" />
								) : (
									formatter.format(data?.[stat.key] ?? 0)
								)}
							</p>
							<p className="mt-2 text-sm text-smoke-dark">{stat.label}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
