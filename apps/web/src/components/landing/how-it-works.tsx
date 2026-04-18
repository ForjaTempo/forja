"use client";

import { motion } from "framer-motion";
import { CheckCircleIcon, MousePointerClickIcon, WalletIcon } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";

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
		description: "Pick from Token Create, Multisend, Lock, Claim, or Launchpad.",
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
				<ScrollReveal>
					<div className="text-center">
						<p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo">How it works</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
							Three steps. That&apos;s it.
						</h2>
					</div>
				</ScrollReveal>

				<motion.div
					className="mt-14 grid gap-8 md:grid-cols-3"
					variants={staggerContainer}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-50px" }}
				>
					{steps.map((step, i) => (
						<motion.div key={step.step} variants={fadeInUp} className="relative text-center">
							{/* Connector line between steps */}
							{i < steps.length - 1 && (
								<div
									aria-hidden="true"
									className="absolute right-0 top-8 hidden h-px w-[calc(100%-3rem)] translate-x-1/2 bg-gradient-to-r from-border-hair to-transparent md:block"
								/>
							)}

							<div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-border-hair bg-bg-field">
								<step.icon className="size-6 text-indigo" />
							</div>

							<p className="mt-1 font-mono text-xs text-text-tertiary">{step.step}</p>
							<h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-text-tertiary">{step.description}</p>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
