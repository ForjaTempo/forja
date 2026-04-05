import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function TokensLoading() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<div>
					<Skeleton className="h-9 w-48" />
					<Skeleton className="mt-2 h-5 w-72" />
				</div>
				<div className="grid grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`stat-${i.toString()}`} className="h-20 rounded-lg" />
					))}
				</div>
				<Skeleton className="h-10 w-full sm:max-w-md" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={`card-${i.toString()}`} className="h-44 rounded-lg" />
					))}
				</div>
			</div>
		</PageContainer>
	);
}
