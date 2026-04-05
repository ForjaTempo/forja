"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import { getCreatorProfile, getCreatorTokens } from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { CreatorOverview } from "@/components/token-hub/creator-overview";
import { CreatorTokens } from "@/components/token-hub/creator-tokens";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorPage() {
	const { address } = useParams<{ address: string }>();

	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ["creator-profile", address],
		queryFn: () => getCreatorProfile(address),
		staleTime: 60_000,
	});

	const { data: tokens = [] } = useQuery({
		queryKey: ["creator-tokens", address],
		queryFn: () => getCreatorTokens(address),
		staleTime: 60_000,
		enabled: !!profile,
	});

	if (profileLoading) {
		return (
			<PageContainer className="py-8 sm:py-12">
				<div className="space-y-6">
					<div>
						<Skeleton className="h-8 w-48" />
						<Skeleton className="mt-2 h-5 w-32" />
					</div>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={`stat-${i.toString()}`} className="h-16 rounded-lg" />
						))}
					</div>
					<Skeleton className="h-6 w-36" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={`card-${i.toString()}`} className="h-44 rounded-lg" />
						))}
					</div>
				</div>
			</PageContainer>
		);
	}

	if (!profile) {
		notFound();
	}

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<CreatorOverview profile={profile} />
				<CreatorTokens tokens={tokens} />
			</div>
		</PageContainer>
	);
}
