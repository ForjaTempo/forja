import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
	return (
		<PageContainer className="py-16 sm:py-20">
			<div className="space-y-10">
				<div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
					<div className="space-y-3">
						<Skeleton className="h-6 w-40 rounded-full" />
						<Skeleton className="h-20 w-[60ch] max-w-full rounded-xl" />
					</div>
					<Skeleton className="h-11 w-48 rounded-xl" />
				</div>
				<Skeleton className="h-72 w-full rounded-3xl" />
				<Skeleton className="h-11 w-full max-w-md rounded-xl" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={`card-${i.toString()}`} className="h-40 rounded-2xl" />
					))}
				</div>
			</div>
		</PageContainer>
	);
}
