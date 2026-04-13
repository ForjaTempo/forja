import { CheckCircleIcon, MousePointerClickIcon, WalletIcon } from "lucide-react";

const steps = [
	{
		step: "01",
		icon: WalletIcon,
		title: "Connect Wallet",
		description: "Link your wallet to FORJA with one click via RainbowKit.",
	},
	{
		step: "02",
		icon: MousePointerClickIcon,
		title: "Choose Tool",
		description: "Pick from Token Create, Multisend, or Token Lock.",
	},
	{
		step: "03",
		icon: CheckCircleIcon,
		title: "Confirm Transaction",
		description: "Review details, approve the transaction, and you're done.",
	},
] as const;

export function HowItWorks() {
	return (
		<section className="py-20 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo">How it works</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
						Three steps. That's it.
					</h2>
				</div>

				<div className="mt-14 grid gap-8 md:grid-cols-3">
					{steps.map((step, i) => (
						<div key={step.step} className="relative text-center">
							{/* Connector line between steps */}
							{i < steps.length - 1 && (
								<div
									aria-hidden="true"
									className="absolute right-0 top-8 hidden h-px w-[calc(100%-3rem)] translate-x-1/2 bg-gradient-to-r from-anvil-gray-light to-transparent md:block"
								/>
							)}

							<div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-anvil-gray-light bg-anvil-gray">
								<step.icon className="size-6 text-indigo" />
							</div>

							<p className="mt-1 font-mono text-xs text-smoke-dark">{step.step}</p>
							<h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-smoke-dark">{step.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
