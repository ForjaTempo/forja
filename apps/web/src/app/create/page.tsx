"use client";

import { useCallback, useState } from "react";
import { SuccessModal } from "@/components/create/success-modal";
import { TokenForm } from "@/components/create/token-form";
import { TokensList } from "@/components/create/tokens-list";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useAppStore } from "@/stores/app-store";

interface CreatedToken {
	name: string;
	symbol: string;
	txHash: string;
	tokenAddress: string;
}

export default function CreatePage() {
	const [successData, setSuccessData] = useState<CreatedToken | null>(null);
	const [formKey, setFormKey] = useState(0);
	const { txConfirmed } = useTransactionToast();
	const addTransaction = useAppStore((s) => s.addTransaction);

	const handleSuccess = useCallback(
		(data: CreatedToken) => {
			setSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "create",
				description: `Created ${data.symbol} token`,
				timestamp: Date.now(),
			});
		},
		[txConfirmed, addTransaction],
	);

	const handleCreateAnother = useCallback(() => {
		setSuccessData(null);
		setFormKey((k) => k + 1);
	}, []);

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-lg space-y-8">
				<PageHeader title="Create Token" description="Create a new TIP-20 token on Tempo" />
				<TokenForm key={formKey} onSuccess={handleSuccess} />
				<Separator className="bg-anvil-gray-light" />
				<TokensList />
			</div>

			{successData && (
				<SuccessModal
					open={!!successData}
					onOpenChange={(open) => {
						if (!open) setSuccessData(null);
					}}
					name={successData.name}
					symbol={successData.symbol}
					tokenAddress={successData.tokenAddress}
					txHash={successData.txHash}
					onCreateAnother={handleCreateAnother}
				/>
			)}
		</PageContainer>
	);
}
