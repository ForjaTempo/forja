import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function TokensLoading() {
	return (
		<PageContainer className="py-16 sm:py-20">
			<div className="space-y-10">
				<div className="space-y-3">
					<Skeleton className="h-6 w-40 rounded-full" />
					<Skeleton className="h-16 w-[70%] rounded-xl" />
					<Skeleton className="h-5 w-2/3 rounded" />
				</div>
				<div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border-hair">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`stat-${i.toString()}`} className="h-24 rounded-none" />
					))}
				</div>
				<Skeleton className="h-12 w-full max-w-md rounded-xl" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={`card-${i.toString()}`} className="h-44 rounded-2xl" />
					))}
				</div>
			</div>
		</PageContainer>
	);
}
