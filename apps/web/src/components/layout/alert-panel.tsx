"use client";

import type { Alert } from "@forja/db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowRightLeftIcon,
	BellIcon,
	CheckCheckIcon,
	CheckCircle2Icon,
	SparklesIcon,
	TrendingUpIcon,
	UnlockIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { markAlertAsRead, markAllAlertsAsRead } from "@/actions/alerts";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { DATE_GROUP_LABELS, DATE_GROUP_ORDER, groupByDate } from "@/lib/date-groups";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
	holder_spike: <TrendingUpIcon className="size-4 text-green" />,
	large_transfer: <ArrowRightLeftIcon className="size-4 text-gold" />,
	unlock_soon: <UnlockIcon className="size-4 text-indigo" />,
	milestone: <UsersIcon className="size-4 text-ember" />,
	campaign_live: <SparklesIcon className="size-4 text-gold" />,
};

function getAlertLink(alert: Alert): string {
	if (alert.metadata) {
		try {
			const meta = JSON.parse(alert.metadata);
			if (meta.slug) return `/claim/${meta.slug}`;
			if (meta.txHash) return `/tokens/${alert.tokenAddress}`;
		} catch {}
	}
	return `/tokens/${alert.tokenAddress}`;
}

function timeAgo(date: Date | string): string {
	const now = new Date();
	const then = new Date(date);
	const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

interface AlertPanelProps {
	alerts: Alert[];
	onClose?: () => void;
}

export function AlertPanel({ alerts, onClose }: AlertPanelProps) {
	const { address } = useAccount();
	const queryClient = useQueryClient();
	const { withAuth } = useWalletAuth();

	const markAllMutation = useMutation({
		mutationFn: () => withAuth(() => markAllAlertsAsRead(address as string)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["alerts", address] });
			queryClient.invalidateQueries({ queryKey: ["unread-alert-count", address] });
		},
	});

	const markOneMutation = useMutation({
		mutationFn: (alertId: number) => withAuth(() => markAlertAsRead(alertId, address as string)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["alerts", address] });
			queryClient.invalidateQueries({ queryKey: ["unread-alert-count", address] });
		},
	});

	const unreadCount = useMemo(() => alerts.filter((a) => !a.isRead).length, [alerts]);
	const groups = useMemo(() => groupByDate(alerts), [alerts]);

	if (alerts.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-green/10 text-green">
					<CheckCircle2Icon className="size-6" />
				</div>
				<div>
					<p className="font-display text-[16px] tracking-[-0.01em] text-text-primary">
						All caught up
					</p>
					<p className="mt-1 text-[12.5px] text-text-tertiary">
						You're up to date. We'll let you know when something new happens.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div className="flex items-center justify-between border-border-hair border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<h3 className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Notifications
					</h3>
					{unreadCount > 0 && (
						<span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-gold/40 bg-gold/10 px-1.5 font-mono text-[10px] text-gold">
							{unreadCount}
						</span>
					)}
				</div>
				{unreadCount > 0 && (
					<button
						type="button"
						onClick={() => markAllMutation.mutate()}
						disabled={markAllMutation.isPending}
						className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] text-text-tertiary transition-colors hover:bg-bg-field hover:text-text-primary disabled:opacity-50"
					>
						<CheckCheckIcon className="size-3" />
						Mark all read
					</button>
				)}
			</div>

			<div className="max-h-[32rem] overflow-y-auto">
				<AnimatePresence initial={true}>
					{DATE_GROUP_ORDER.map((groupKey) => {
						const group = groups[groupKey];
						if (group.length === 0) return null;

						return (
							<motion.section
								key={groupKey}
								initial={{ opacity: 0, x: 12 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.2, ease: "easeOut" }}
							>
								<div className="sticky top-0 z-10 border-border-hair/50 border-b bg-bg-elevated/95 px-4 py-2 backdrop-blur">
									<p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
										{DATE_GROUP_LABELS[groupKey]}
									</p>
								</div>
								<div>
									{group.map((alert) => (
										<Link
											key={alert.id}
											href={getAlertLink(alert)}
											onClick={() => {
												if (!alert.isRead) markOneMutation.mutate(alert.id);
												onClose?.();
											}}
											className={cn(
												"flex items-start gap-3 border-border-hair/50 border-b px-4 py-3 transition-colors hover:bg-bg-field/60",
												!alert.isRead && "bg-bg-field/30",
											)}
										>
											<div className="mt-0.5 shrink-0">
												{TYPE_ICONS[alert.type] ?? (
													<BellIcon className="size-4 text-text-tertiary" />
												)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<p
														className={cn(
															"text-[13.5px] font-medium",
															alert.isRead ? "text-text-secondary" : "text-text-primary",
														)}
													>
														{alert.title}
													</p>
													{!alert.isRead && (
														<span className="size-1.5 shrink-0 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold-glow)]" />
													)}
												</div>
												<p className="mt-0.5 line-clamp-2 text-[12.5px] text-text-tertiary">
													{alert.message}
												</p>
												<p className="mt-1 font-mono text-[10.5px] text-text-tertiary/70">
													{timeAgo(alert.createdAt)}
												</p>
											</div>
										</Link>
									))}
								</div>
							</motion.section>
						);
					})}
				</AnimatePresence>
			</div>
		</div>
	);
}
