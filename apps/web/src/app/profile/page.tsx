"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRoundIcon, WalletIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { getCreatorProfileData } from "@/actions/profile";
import { ConnectButton } from "@/components/layout/connect-button";
import { PageContainer } from "@/components/layout/page-container";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGate } from "@/contexts/auth-context";

export default function ProfilePage() {
	const { address, isConnected } = useAccount();
	const { isAuthed, isChecking, needsAuth, requestAuth } = useAuthGate();

	const { data: existing, isLoading } = useQuery({
		queryKey: ["creator-profile-data", address],
		queryFn: () => getCreatorProfileData(address as string),
		enabled: isConnected && !!address && isAuthed,
		staleTime: 30_000,
	});

	if (!isConnected) {
		return (
			<PageContainer className="py-8 sm:py-12">
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
					<WalletIcon className="size-12 text-smoke-dark" />
					<h2 className="text-xl font-semibold text-steel-white">Connect Your Wallet</h2>
					<p className="text-sm text-smoke-dark">
						Connect your wallet to edit your creator profile
					</p>
					<ConnectButton />
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-2xl space-y-8">
				<PageHeader
					title="Edit Profile"
					description="Customize how you appear on your creator page"
				/>

				{needsAuth ? (
					<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 py-12">
						<KeyRoundIcon className="size-10 text-smoke-dark" />
						<p className="text-sm text-smoke-dark">
							Sign a message to verify your wallet and load your profile
						</p>
						<Button
							onClick={() => requestAuth()}
							className="bg-molten-amber text-forge-black hover:bg-molten-amber/90"
						>
							Sign to Verify
						</Button>
					</div>
				) : isLoading || isChecking ? (
					<div className="space-y-4">
						<Skeleton className="h-10 rounded-md" />
						<Skeleton className="h-10 rounded-md" />
						<Skeleton className="h-24 rounded-md" />
					</div>
				) : (
					<ProfileForm address={address as string} existing={existing ?? null} />
				)}
			</div>
		</PageContainer>
	);
}
