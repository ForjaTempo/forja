"use client";

import { useQuery } from "@tanstack/react-query";
import { BellIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { getAlerts, getUnreadAlertCount } from "@/actions/alerts";
import { AlertPanel } from "@/components/layout/alert-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuthGate } from "@/contexts/auth-context";

export function NotificationBell() {
	const { address, isConnected } = useAccount();
	const [open, setOpen] = useState(false);
	const { isAuthed, needsAuth, requestAuth } = useAuthGate();

	const { data: unreadCount = 0 } = useQuery({
		queryKey: ["unread-alert-count", address],
		queryFn: () => getUnreadAlertCount(address as string),
		enabled: isConnected && !!address && isAuthed,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});

	const { data: alertData } = useQuery({
		queryKey: ["alerts", address],
		queryFn: () => getAlerts(address as string, { limit: 30 }),
		enabled: isConnected && !!address && isAuthed && open,
		staleTime: 15_000,
	});

	if (!isConnected) return null;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<BellIcon className="size-5 text-smoke" />
					{unreadCount > 0 && (
						<span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-indigo text-[10px] font-bold text-white">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
					<span className="sr-only">Notifications</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-80 border-anvil-gray-light bg-anvil-gray p-0 sm:w-96">
				<SheetHeader className="sr-only">
					<SheetTitle>Notifications</SheetTitle>
				</SheetHeader>
				{needsAuth ? (
					<div className="flex flex-col items-center justify-center gap-4 py-16">
						<KeyRoundIcon className="size-8 text-smoke-dark" />
						<p className="px-4 text-center text-sm text-smoke-dark">
							Sign a message to verify your wallet and view notifications
						</p>
						<Button
							onClick={async () => {
								const ok = await requestAuth();
								if (!ok) setOpen(false);
							}}
							className="bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Sign to Verify
						</Button>
					</div>
				) : (
					<AlertPanel alerts={alertData?.alerts ?? []} onClose={() => setOpen(false)} />
				)}
			</SheetContent>
		</Sheet>
	);
}
