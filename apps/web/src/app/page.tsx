import { getGlobalStats } from "@/actions/stats";
import { Cta } from "@/components/landing/cta";
import { Hero } from "@/components/landing/hero";
import { ToolCards } from "@/components/landing/tool-cards";

export default async function Home() {
	const stats = await getGlobalStats();

	return (
		<>
			<Hero
				tokensCount={stats.tokensCreated}
				launchesCount={stats.launchesCount}
				creatorsCount={stats.uniqueCreators}
			/>
			<ToolCards />
			<Cta />
		</>
	);
}
