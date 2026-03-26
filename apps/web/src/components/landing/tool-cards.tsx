import { HammerIcon, LockIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
	{
		title: "Token Create",
		description:
			"Deploy your own TIP-20 token in seconds. Set name, symbol, supply — no Solidity required.",
		href: "/create",
		icon: HammerIcon,
		accent: "from-molten-amber/20 to-molten-amber/5",
		iconColor: "text-molten-amber",
	},
	{
		title: "Multisend",
		description:
			"Distribute tokens to up to 500 addresses in a single transaction. Airdrops made simple.",
		href: "/multisend",
		icon: SendIcon,
		accent: "from-forge-green/20 to-forge-green/5",
		iconColor: "text-forge-green",
	},
	{
		title: "Token Lock",
		description:
			"Lock tokens with vesting schedules, cliff periods, and optional revocation for trust.",
		href: "/lock",
		icon: LockIcon,
		accent: "from-sky-500/20 to-sky-500/5",
		iconColor: "text-sky-400",
	},
] as const;

export function ToolCards() {
	return (
		<section className="py-20 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid gap-6 md:grid-cols-3">
					{tools.map((tool, i) => (
						<Card
							key={tool.href}
							className="group relative border-anvil-gray-light/60 bg-anvil-gray/50 transition-all duration-300 hover:border-anvil-gray-light hover:shadow-lg hover:shadow-black/20"
							style={{ animationDelay: `${i * 0.1}s` }}
						>
							{/* Top gradient accent line */}
							<div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tool.accent}`} />

							<CardHeader>
								<div
									className={`mb-2 flex size-11 items-center justify-center rounded-lg bg-anvil-gray-light ${tool.iconColor}`}
								>
									<tool.icon className="size-5" />
								</div>
								<CardTitle className="text-lg">{tool.title}</CardTitle>
								<CardDescription className="text-smoke-dark">{tool.description}</CardDescription>
							</CardHeader>

							<CardFooter>
								<Button
									asChild
									variant="ghost"
									className="gap-1.5 px-0 text-sm text-smoke hover:text-steel-white"
								>
									<Link href={tool.href}>
										Get started
										<SendIcon className="size-3.5" />
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
