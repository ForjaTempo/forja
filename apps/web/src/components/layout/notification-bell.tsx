"use client";

import { useQuery } from "@tanstack/react-query";
import { BellIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { getAlerts, getUnreadAlertCount } from "@/actions/alerts";
import { AlertPanel } from "@/components/layout/alert-panel";
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

	const label = unreadCount > 0 ? `Notifications · ${unreadCount} unread` : "Notifications";

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<button
					type="button"
					aria-label={label}
					className="relative inline-flex size-9 items-center justify-center rounded-lg border border-border-hair bg-bg-field text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
				>
					<BellIcon className="size-4" />
					{unreadCount > 0 && (
						<span
							aria-hidden
							className="-right-0.5 -top-0.5 absolute flex size-4 items-center justify-center rounded-full bg-gold font-mono font-bold text-[#1a1307] text-[9px] shadow-[0_0_8px_var(--color-gold-glow)]"
						>
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
				</button>
			</SheetTrigger>
			<SheetContent side="right" className="w-80 border-border-subtle bg-bg-elevated p-0 sm:w-96">
				<SheetHeader className="sr-only">
					<SheetTitle>Notifications</SheetTitle>
				</SheetHeader>
				{needsAuth ? (
					<div className="flex flex-col items-center justify-center gap-4 py-16">
						<KeyRoundIcon className="size-8 text-text-tertiary" />
						<p className="px-4 text-center text-[13px] text-text-tertiary">
							Sign a message to verify your wallet and view notifications
						</p>
						<button
							type="button"
							onClick={async () => {
								const ok = await requestAuth();
								if (!ok) setOpen(false);
							}}
							className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-[#1a1307] text-[13px] transition-transform hover:-translate-y-0.5"
							style={{
								background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
								boxShadow: "0 4px 20px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
							}}
						>
							Sign to verify
						</button>
					</div>
				) : (
					<AlertPanel alerts={alertData?.alerts ?? []} onClose={() => setOpen(false)} />
				)}
			</SheetContent>
		</Sheet>
	);
}
