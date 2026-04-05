import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function TokenDetailLoading() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-6">
				<div className="flex items-start gap-4">
					<Skeleton className="size-14 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-5 w-32" />
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={`stat-${i.toString()}`} className="h-20 rounded-lg" />
					))}
				</div>
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		</PageContainer>
	);
}
