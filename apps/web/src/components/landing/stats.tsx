const stats = [
	{ label: "Tokens Created", value: "--" },
	{ label: "Tokens Distributed", value: "--" },
	{ label: "Tokens Locked", value: "--" },
] as const;

export function Stats() {
	return (
		<section className="border-y border-anvil-gray-light/40 bg-anvil-gray/30 py-16 sm:py-20">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid gap-8 sm:grid-cols-3">
					{stats.map((stat) => (
						<div key={stat.label} className="text-center">
							<p className="font-mono text-4xl font-bold text-molten-amber sm:text-5xl">
								{stat.value}
							</p>
							<p className="mt-2 text-sm text-smoke-dark">{stat.label}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
