import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function MultisendLoading() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-lg space-y-8">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-5 w-80" />
				</div>
				<div className="space-y-4 rounded-xl border border-anvil-gray-light bg-anvil-gray p-6">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-12 w-full rounded-lg" />
				</div>
			</div>
		</PageContainer>
	);
}
