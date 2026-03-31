"use client";

import { useCallback, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LockForm } from "@/components/lock/lock-form";
import { LocksList } from "@/components/lock/locks-list";
import { LockSuccessModal } from "@/components/lock/success-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactionToast } from "@/hooks/use-transaction-toast";
import { useUserLocks } from "@/hooks/use-user-locks";
import { useAppStore } from "@/stores/app-store";

interface LockSuccess {
	lockId: bigint;
	tokenSymbol: string;
	amount: string;
	beneficiary: string;
	txHash: string;
	endTime: Date;
}

export default function LockPage() {
	const [activeTab, setActiveTab] = useState("create");
	const [successData, setSuccessData] = useState<LockSuccess | null>(null);
	const [formKey, setFormKey] = useState(0);
	const { txConfirmed } = useTransactionToast();
	const addTransaction = useAppStore((s) => s.addTransaction);
	const { createdLocks, beneficiaryLocks, isLoading, refetch } = useUserLocks();

	const handleSuccess = useCallback(
		(data: LockSuccess) => {
			setSuccessData(data);
			txConfirmed(data.txHash);
			addTransaction({
				hash: data.txHash,
				type: "lock",
				description: `Locked ${data.amount} ${data.tokenSymbol}`,
				timestamp: Date.now(),
			});
			refetch();
		},
		[txConfirmed, addTransaction, refetch],
	);

	const handleCreateAnother = useCallback(() => {
		setSuccessData(null);
		setFormKey((k) => k + 1);
	}, []);

	const handleViewLocks = useCallback(() => {
		setSuccessData(null);
		setActiveTab("my-locks");
	}, []);

	const handleActionComplete = useCallback(() => {
		refetch();
	}, [refetch]);

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-lg space-y-8">
				<PageHeader title="Token Lock" description="Lock tokens with optional vesting schedules" />

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="w-full">
						<TabsTrigger value="create">Create Lock</TabsTrigger>
						<TabsTrigger value="my-locks">My Locks</TabsTrigger>
						<TabsTrigger value="claim">Claim</TabsTrigger>
					</TabsList>

					<TabsContent value="create">
						<LockForm key={formKey} onSuccess={handleSuccess} />
					</TabsContent>

					<TabsContent value="my-locks">
						<LocksList
							locks={createdLocks}
							viewRole="creator"
							isLoading={isLoading}
							onActionComplete={handleActionComplete}
						/>
					</TabsContent>

					<TabsContent value="claim">
						<LocksList
							locks={beneficiaryLocks}
							viewRole="beneficiary"
							isLoading={isLoading}
							onActionComplete={handleActionComplete}
						/>
					</TabsContent>
				</Tabs>
			</div>

			{successData && (
				<LockSuccessModal
					open={!!successData}
					onOpenChange={(open) => {
						if (!open) setSuccessData(null);
					}}
					lockId={successData.lockId}
					tokenSymbol={successData.tokenSymbol}
					amount={successData.amount}
					beneficiary={successData.beneficiary}
					txHash={successData.txHash}
					endTime={successData.endTime}
					onCreateAnother={handleCreateAnother}
					onViewLocks={handleViewLocks}
				/>
			)}
		</PageContainer>
	);
}
