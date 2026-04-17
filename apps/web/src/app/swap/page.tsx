import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { SwapClient } from "@/components/swap/swap-client";

export default function SwapPage() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<Suspense fallback={null}>
				<SwapClient />
			</Suspense>
		</PageContainer>
	);
}
