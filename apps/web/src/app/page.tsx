import { getGlobalStats } from "@/actions/stats";
import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HeroStats } from "@/components/landing/hero-stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SocialProof } from "@/components/landing/social-proof";
import { Stats } from "@/components/landing/stats";
import { ToolCards } from "@/components/landing/tool-cards";

export default async function Home() {
	const stats = await getGlobalStats();

	return (
		<>
			<Hero />
			<HeroStats
				tokensCreated={stats.tokensCreated}
				launchesCount={stats.launchesCount}
				uniqueCreators={stats.uniqueCreators}
			/>
			<ToolCards />
			<Features />
			<Stats
				tokensCreated={stats.tokensCreated}
				multisendCount={stats.multisendCount}
				locksCreated={stats.locksCreated}
				launchesCount={stats.launchesCount}
			/>
			<HowItWorks />
			<SocialProof />
			<Cta uniqueCreators={stats.uniqueCreators} />
		</>
	);
}
