"use client";

import { useCallback, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { MultisendForm } from "@/components/multisend/multisend-form";
import { PageHeader } from "@/components/ui/page-header";

export default function MultisendPage() {
	const [formKey, setFormKey] = useState(0);

	const handleSuccess = useCallback(
		(_data: {
			tokenSymbol: string;
			recipientCount: number;
			totalAmount: string;
			txHash: string;
		}) => {
			// Success modal and store integration added in commit 3
		},
		[],
	);

	const _handleSendAnother = useCallback(() => {
		setFormKey((k) => k + 1);
	}, []);

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-lg space-y-8">
				<PageHeader title="Multisend" description="Send tokens to multiple recipients at once" />
				<MultisendForm key={formKey} onSuccess={handleSuccess} />
			</div>
		</PageContainer>
	);
}
