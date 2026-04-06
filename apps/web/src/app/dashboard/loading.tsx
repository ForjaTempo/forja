import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<Skeleton className="h-9 w-48" />
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={`stat-${i.toString()}`} className="h-24 rounded-lg" />
					))}
				</div>
				<Skeleton className="h-10 w-64" />
				<div className="grid gap-4 md:grid-cols-2">
					<Skeleton className="h-64 rounded-lg" />
					<Skeleton className="h-64 rounded-lg" />
				</div>
			</div>
		</PageContainer>
	);
}
