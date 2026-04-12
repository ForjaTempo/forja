import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLaunchDetail, getLaunchTrades } from "@/actions/launches";
import { LaunchDetailClient } from "@/components/launch/launch-detail-client";

interface Props {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const launchDbId = Number(id);
	if (!Number.isFinite(launchDbId) || launchDbId <= 0) return { title: "Launch Not Found | FORJA" };

	const launch = await getLaunchDetail(launchDbId);
	if (!launch) return { title: "Launch Not Found | FORJA" };

	return {
		title: `${launch.name} ($${launch.symbol}) | FORJA Launch`,
		description: launch.description || `${launch.name} token on FORJA bonding curve launchpad.`,
	};
}

export default async function LaunchDetailPage({ params }: Props) {
	const { id } = await params;
	const launchDbId = Number(id);
	if (!Number.isFinite(launchDbId) || launchDbId <= 0) notFound();

	const [launch, tradesData] = await Promise.all([
		getLaunchDetail(launchDbId),
		getLaunchTrades(launchDbId, { limit: 20 }),
	]);

	if (!launch) notFound();

	return <LaunchDetailClient initialLaunch={launch} initialTrades={tradesData} />;
}
