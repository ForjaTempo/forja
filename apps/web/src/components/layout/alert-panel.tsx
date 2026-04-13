"use client";

import type { Alert } from "@forja/db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ArrowRightLeftIcon,
	BellIcon,
	CheckCheckIcon,
	SparklesIcon,
	TrendingUpIcon,
	UnlockIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { markAlertAsRead, markAllAlertsAsRead } from "@/actions/alerts";
import { Button } from "@/components/ui/button";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
	holder_spike: <TrendingUpIcon className="size-4 text-emerald-400" />,
	large_transfer: <ArrowRightLeftIcon className="size-4 text-yellow-400" />,
	unlock_soon: <UnlockIcon className="size-4 text-blue-400" />,
	milestone: <UsersIcon className="size-4 text-molten-amber" />,
	campaign_live: <SparklesIcon className="size-4 text-purple-400" />,
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

	const unreadCount = alerts.filter((a) => !a.isRead).length;

	if (alerts.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-12">
				<BellIcon className="size-8 text-smoke-dark" />
				<p className="text-sm text-smoke-dark">No notifications yet</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-anvil-gray-light px-4 py-3">
				<h3 className="text-sm font-semibold text-steel-white">Notifications</h3>
				{unreadCount > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => markAllMutation.mutate()}
						disabled={markAllMutation.isPending}
						className="text-xs text-smoke hover:text-steel-white"
					>
						<CheckCheckIcon className="mr-1 size-3" />
						Mark all as read
					</Button>
				)}
			</div>

			{/* Alert list */}
			<div className="max-h-96 overflow-y-auto">
				{alerts.map((alert) => (
					<Link
						key={alert.id}
						href={getAlertLink(alert)}
						onClick={() => {
							if (!alert.isRead) markOneMutation.mutate(alert.id);
							onClose?.();
						}}
						className={cn(
							"flex items-start gap-3 border-b border-anvil-gray-light/50 px-4 py-3 transition-colors hover:bg-anvil-gray-light/30",
							!alert.isRead && "bg-anvil-gray-light/10",
						)}
					>
						<div className="mt-0.5 shrink-0">
							{TYPE_ICONS[alert.type] ?? <BellIcon className="size-4 text-smoke-dark" />}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<p
									className={cn(
										"text-sm font-medium",
										alert.isRead ? "text-smoke" : "text-steel-white",
									)}
								>
									{alert.title}
								</p>
								{!alert.isRead && <span className="size-2 shrink-0 rounded-full bg-indigo" />}
							</div>
							<p className="mt-0.5 text-xs text-smoke-dark line-clamp-2">{alert.message}</p>
							<p className="mt-1 text-xs text-smoke-dark/60">{timeAgo(alert.createdAt)}</p>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
