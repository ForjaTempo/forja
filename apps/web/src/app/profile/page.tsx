"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRoundIcon, WalletIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { getCreatorProfileData } from "@/actions/profile";
import { ConnectButton } from "@/components/layout/connect-button";
import { PageContainer } from "@/components/layout/page-container";
import { ProfileForm } from "@/components/profile/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGate } from "@/contexts/auth-context";

const goldButtonStyle = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};
const goldButtonCls =
	"inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-[#1a1307] text-[14px] transition-transform hover:-translate-y-0.5";

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
			<PageContainer className="py-16 sm:py-20">
				<div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-hair bg-bg-elevated p-10 text-center">
					<WalletIcon className="size-10 text-text-tertiary" />
					<h2 className="font-display text-[24px] tracking-[-0.01em] text-text-primary">
						Connect your wallet
					</h2>
					<p className="text-[13.5px] text-text-tertiary">
						Sign in with your wallet to edit your creator profile.
					</p>
					<ConnectButton />
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer className="py-16 sm:py-20">
			<div className="mx-auto max-w-5xl space-y-8">
				<header className="space-y-3">
					<div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(129,140,248,0.2)] bg-[rgba(129,140,248,0.08)] py-1 pl-1 pr-3 text-[12px] text-indigo">
						<span className="rounded-sm bg-indigo px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#0b0b1a]">
							/PROFILE
						</span>
						Creator identity
					</div>
					<h1
						className="m-0 font-display font-normal leading-[0.95] tracking-[-0.03em]"
						style={{ fontSize: "clamp(32px, 5vw, 52px)" }}
					>
						Sign your work. <span className="gold-text italic">Shape your page.</span>
					</h1>
					<p className="max-w-xl text-[14.5px] text-text-secondary">
						Claim your handle, banner, and links. Everything you edit here is what visitors see on
						your creator page.
					</p>
				</header>

				{needsAuth ? (
					<div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border-hair bg-bg-elevated py-16">
						<KeyRoundIcon className="size-10 text-text-tertiary" />
						<p className="max-w-sm text-center text-[13.5px] text-text-secondary">
							Sign a one-time message to prove wallet ownership. No transaction is sent.
						</p>
						<button
							type="button"
							onClick={() => requestAuth()}
							className={goldButtonCls}
							style={goldButtonStyle}
						>
							Sign to verify
						</button>
					</div>
				) : isLoading || isChecking ? (
					<div className="space-y-4">
						<Skeleton className="h-32 rounded-2xl" />
						<Skeleton className="h-10 rounded-xl" />
						<Skeleton className="h-24 rounded-xl" />
					</div>
				) : (
					<ProfileForm address={address as string} existing={existing ?? null} />
				)}
			</div>
		</PageContainer>
	);
}
