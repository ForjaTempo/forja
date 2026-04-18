import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const trustBadges = [
	"Powered by Tempo",
	"EVM Compatible",
	"Open Source",
	"Self-Custodial",
] as const;

export function SocialProof() {
	return (
		<section className="py-12 sm:py-16">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<ScrollReveal>
					<div className="flex flex-wrap items-center justify-center gap-3">
						{trustBadges.map((badge) => (
							<Badge
								key={badge}
								variant="outline"
								className="px-4 py-1.5 text-sm text-text-tertiary"
							>
								{badge}
							</Badge>
						))}
					</div>
				</ScrollReveal>
			</div>
		</section>
	);
}
