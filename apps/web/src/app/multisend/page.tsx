"use client";

import { useCallback, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { MultisendForm } from "@/components/multisend/multisend-form";
import { SendsList } from "@/components/multisend/sends-list";
import { SuccessModal } from "@/components/multisend/success-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useAppStore } from "@/stores/app-store";

interface MultisendSuccess {
	tokenSymbol: string;
	recipientCount: number;
	totalAmount: bigint;
	txHash: string;
}

export default function MultisendPage() {
	const [successData, setSuccessData] = useState<MultisendSuccess | null>(null);
	const [formKey, setFormKey] = useState(0);
	const [listKey, setListKey] = useState(0);
	const { txConfirmed } = useTransactionToast();
	const addTransaction = useAppStore((s) => s.addTransaction);

	const handleSuccess = useCallback(
		(data: MultisendSuccess) => {
			setSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "multisend",
				description: `Sent ${data.tokenSymbol} to ${data.recipientCount} recipients`,
				timestamp: Date.now(),
			});
			setListKey((k) => k + 1);
		},
		[txConfirmed, addTransaction],
	);

	const handleSendAnother = useCallback(() => {
		setSuccessData(null);
		setFormKey((k) => k + 1);
	}, []);

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-lg space-y-8">
				<PageHeader title="Multisend" description="Send tokens to multiple recipients at once" />
				<MultisendForm key={formKey} onSuccess={handleSuccess} />
				<Separator className="bg-anvil-gray-light" />
				<SendsList key={listKey} />
			</div>

			{successData && (
				<SuccessModal
					open={!!successData}
					onOpenChange={(open) => {
						if (!open) setSuccessData(null);
					}}
					tokenSymbol={successData.tokenSymbol}
					recipientCount={successData.recipientCount}
					totalAmount={successData.totalAmount}
					txHash={successData.txHash}
					onSendAnother={handleSendAnother}
				/>
			)}
		</PageContainer>
	);
}
