"use client";

import { TokenForm } from "@/components/create/token-form";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function CreatePage() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-lg space-y-8">
				<PageHeader title="Create Token" description="Create a new TIP-20 token on Tempo" />
				<TokenForm />
			</div>
		</PageContainer>
	);
}
