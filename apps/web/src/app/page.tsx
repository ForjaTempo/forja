import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Stats } from "@/components/landing/stats";
import { ToolCards } from "@/components/landing/tool-cards";

export default function Home() {
	return (
		<>
			<Hero />
			<ToolCards />
			<Features />
			<HowItWorks />
			<Stats />
			<Cta />
		</>
	);
}
