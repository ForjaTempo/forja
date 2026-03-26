import { SendIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";

export default function MultisendPage() {
	return (
		<PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
			<div className="flex flex-col items-center gap-4 text-center">
				<div className="flex size-16 items-center justify-center rounded-2xl border border-anvil-gray-light bg-anvil-gray">
					<SendIcon className="size-7 text-forge-green" />
				</div>
				<h1 className="text-2xl font-bold sm:text-3xl">Multisend</h1>
				<p className="text-sm text-smoke-dark">Coming Soon</p>
			</div>
		</PageContainer>
	);
}
