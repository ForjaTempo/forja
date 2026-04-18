import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateLoading() {
	return (
		<PageContainer className="py-16 sm:py-20">
			<div className="mx-auto max-w-2xl space-y-8">
				<div className="space-y-3">
					<Skeleton className="h-6 w-40 rounded-full" />
					<Skeleton className="h-16 w-full rounded-xl" />
					<Skeleton className="h-5 w-2/3 rounded" />
				</div>
				<div className="space-y-5 rounded-2xl border border-border-hair bg-bg-elevated p-6 sm:p-8">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={`f-${i.toString()}`} className="space-y-2">
							<Skeleton className="h-3 w-24 rounded" />
							<Skeleton className="h-11 w-full rounded-xl" />
						</div>
					))}
					<Skeleton className="h-12 w-full rounded-xl" />
				</div>
			</div>
		</PageContainer>
	);
}
