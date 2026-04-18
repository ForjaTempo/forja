"use client";

import type { Lock, Multisend, TokenHubCache } from "@forja/db";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, LockIcon, SendIcon } from "lucide-react";
import {
	getCreatorLocks,
	getCreatorMultisends,
	getCreatorProfile,
	getCreatorTokens,
} from "@/actions/token-hub";
import { PageContainer } from "@/components/layout/page-container";
import { CreatorOverview } from "@/components/token-hub/creator-overview";
import { CreatorTokens } from "@/components/token-hub/creator-tokens";
import { AddressDisplay } from "@/components/ui/address-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { formatDate, formatSupply } from "@/lib/format";

interface CreatorProfile {
	address: string;
	tokensCreated: number;
	multisendCount: number;
	lockCount: number;
	totalRecipients: number;
	totalValueLocked: string;
	firstSeen: Date | null;
	displayName?: string | null;
	bio?: string | null;
	avatarUrl?: string | null;
	website?: string | null;
	twitterHandle?: string | null;
	telegramHandle?: string | null;
	verified?: boolean;
	profileClaimed?: boolean;
}

interface CreatorPageClientProps {
	initialProfile: CreatorProfile;
	initialTokens: TokenHubCache[];
	initialMultisends: Multisend[];
	initialLocks: Lock[];
}

export function CreatorPageClient({
	initialProfile,
	initialTokens,
	initialMultisends,
	initialLocks,
}: CreatorPageClientProps) {
	const addr = initialProfile.address;

	const { data: profile } = useQuery({
		queryKey: ["creator-profile", addr],
		queryFn: () => getCreatorProfile(addr),
		staleTime: 60_000,
		initialData: initialProfile,
	});

	const { data: tokens = [] } = useQuery({
		queryKey: ["creator-tokens", addr],
		queryFn: () => getCreatorTokens(addr),
		staleTime: 60_000,
		initialData: initialTokens,
	});

	const { data: multisends = [] } = useQuery({
		queryKey: ["creator-multisends", addr],
		queryFn: () => getCreatorMultisends(addr),
		staleTime: 60_000,
		initialData: initialMultisends,
	});

	const { data: locks = [] } = useQuery({
		queryKey: ["creator-locks", addr],
		queryFn: () => getCreatorLocks(addr),
		staleTime: 60_000,
		initialData: initialLocks,
	});

	if (!profile) return null;

	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="space-y-8">
				<CreatorOverview profile={profile} />

				<Tabs defaultValue="tokens">
					<TabsList className="border-border-hair border-b bg-transparent">
						<TabsTrigger
							value="tokens"
							className="text-text-secondary data-[state=active]:text-gold"
						>
							Tokens · {tokens.length}
						</TabsTrigger>
						<TabsTrigger
							value="multisends"
							className="text-text-secondary data-[state=active]:text-gold"
						>
							Multisends · {multisends.length}
						</TabsTrigger>
						<TabsTrigger
							value="locks"
							className="text-text-secondary data-[state=active]:text-gold"
						>
							Locks · {locks.length}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="tokens" className="mt-6">
						<CreatorTokens tokens={tokens} />
					</TabsContent>

					<TabsContent value="multisends" className="mt-6">
						<MultisendList multisends={multisends} />
					</TabsContent>

					<TabsContent value="locks" className="mt-6">
						<LockList locks={locks} />
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}

const formatter = new Intl.NumberFormat("en-US");

function MultisendList({ multisends }: { multisends: Multisend[] }) {
	const explorerUrl = useExplorerUrl();

	if (multisends.length === 0) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-12 text-center">
				<p className="text-[13px] text-text-tertiary">No multisend history.</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated">
			<div className="overflow-x-auto">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							<th className="py-2.5 pr-4 pl-5 text-left font-medium">Token</th>
							<th className="py-2.5 pr-4 text-left font-medium">Recipients</th>
							<th className="py-2.5 pr-4 text-left font-medium">Total</th>
							<th className="py-2.5 pr-4 text-left font-medium">Date</th>
							<th className="py-2.5 pr-5 text-left font-medium">Tx</th>
						</tr>
					</thead>
					<tbody>
						{multisends.map((ms) => (
							<tr key={ms.txHash} className="border-border-hair border-t">
								<td className="py-2.5 pr-4 pl-5">
									<AddressDisplay address={ms.tokenAddress} />
								</td>
								<td className="py-2.5 pr-4 text-text-primary">
									<span className="inline-flex items-center gap-1.5">
										<SendIcon className="size-3 text-text-tertiary" />
										{formatter.format(ms.recipientCount)}
									</span>
								</td>
								<td className="py-2.5 pr-4 font-mono text-[12px] text-text-primary">
									{formatSupply(BigInt(ms.totalAmount))}
								</td>
								<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
									{formatDate(ms.createdAt)}
								</td>
								<td className="py-2.5 pr-5">
									<a
										href={`${explorerUrl}/tx/${ms.txHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
									>
										{`${ms.txHash.slice(0, 6)}…${ms.txHash.slice(-4)}`}
										<ExternalLinkIcon className="size-3" />
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function LockList({ locks }: { locks: Lock[] }) {
	const explorerUrl = useExplorerUrl();

	if (locks.length === 0) {
		return (
			<div className="rounded-2xl border border-border-hair bg-bg-elevated py-12 text-center">
				<p className="text-[13px] text-text-tertiary">No locks created.</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated">
			<div className="overflow-x-auto">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
							<th className="py-2.5 pr-4 pl-5 text-left font-medium">Token</th>
							<th className="py-2.5 pr-4 text-left font-medium">Beneficiary</th>
							<th className="py-2.5 pr-4 text-left font-medium">Amount</th>
							<th className="py-2.5 pr-4 text-left font-medium">Status</th>
							<th className="py-2.5 pr-4 text-left font-medium">End</th>
							<th className="py-2.5 pr-5 text-left font-medium">Tx</th>
						</tr>
					</thead>
					<tbody>
						{locks.map((lock) => {
							const isRevoked = lock.revoked;
							const isExpired = new Date(lock.endTime) < new Date();
							const status = isRevoked ? "Revoked" : isExpired ? "Ended" : "Active";
							const statusColor = isRevoked
								? "text-red"
								: isExpired
									? "text-text-tertiary"
									: "text-green";

							return (
								<tr key={lock.txHash} className="border-border-hair border-t">
									<td className="py-2.5 pr-4 pl-5">
										<AddressDisplay address={lock.tokenAddress} />
									</td>
									<td className="py-2.5 pr-4">
										<AddressDisplay address={lock.beneficiaryAddress} />
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-primary">
										{formatSupply(BigInt(lock.totalAmount))}
									</td>
									<td className="py-2.5 pr-4">
										<span
											className={`inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] ${statusColor}`}
										>
											<LockIcon className="size-3" />
											{status}
										</span>
									</td>
									<td className="py-2.5 pr-4 font-mono text-[12px] text-text-tertiary">
										{formatDate(lock.endTime)}
									</td>
									<td className="py-2.5 pr-5">
										<a
											href={`${explorerUrl}/tx/${lock.txHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors hover:text-gold"
										>
											{`${lock.txHash.slice(0, 6)}…${lock.txHash.slice(-4)}`}
											<ExternalLinkIcon className="size-3" />
										</a>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
