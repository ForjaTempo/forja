import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorLoading() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-6">
				<Skeleton className="h-[220px] w-full rounded-2xl" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={`stat-${i.toString()}`} className="h-16 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-10 w-48 rounded-xl" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`card-${i.toString()}`} className="h-44 rounded-2xl" />
					))}
				</div>
			</div>
		</PageContainer>
	);
}
