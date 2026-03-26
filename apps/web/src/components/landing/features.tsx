import { CoinsIcon, GaugeIcon, MousePointerClickIcon, ShieldCheckIcon } from "lucide-react";

const features = [
	{
		icon: MousePointerClickIcon,
		title: "No-Code",
		description: "Create and manage tokens without writing a single line of code.",
	},
	{
		icon: GaugeIcon,
		title: "Fast",
		description: "Tempo's high-throughput chain means sub-second finality.",
	},
	{
		icon: CoinsIcon,
		title: "Affordable",
		description: "Flat USDC fees. No hidden costs, no percentage-based charges.",
	},
	{
		icon: ShieldCheckIcon,
		title: "Secure",
		description: "Audited contracts with CEI pattern, input validation, and fuzz testing.",
	},
] as const;

export function Features() {
	return (
		<section className="border-y border-anvil-gray-light/40 bg-anvil-gray/30 py-20 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<p className="font-mono text-xs uppercase tracking-[0.2em] text-molten-amber">
						Why FORJA
					</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
						Built for builders
					</h2>
				</div>

				<div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{features.map((feature) => (
						<div key={feature.title} className="group text-center">
							<div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-anvil-gray-light bg-anvil-gray transition-colors group-hover:border-molten-amber/30 group-hover:bg-anvil-gray-light">
								<feature.icon className="size-5 text-smoke transition-colors group-hover:text-molten-amber" />
							</div>
							<h3 className="mt-4 text-base font-semibold text-steel-white">
								{feature.title}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-smoke-dark">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
