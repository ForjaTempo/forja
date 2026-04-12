import { getLaunches, getLaunchStats } from "@/actions/launches";
import { LaunchPageClient } from "@/components/launch/launch-page-client";

export default async function LaunchPage() {
	const [initialData, stats] = await Promise.all([
		getLaunches({ status: "active", sort: "volume", limit: 20 }),
		getLaunchStats(),
	]);

	return <LaunchPageClient initialData={initialData} initialStats={stats} />;
}
