import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorLoading() {
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
