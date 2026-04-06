"use client";

import { CalendarIcon, ClockIcon } from "lucide-react";
import type { UnlockEvent } from "@/actions/dashboard";
import { AddressDisplay } from "@/components/ui/address-display";
import { formatDate, formatSupply } from "@/lib/format";
import { formatDuration } from "@/lib/lock-utils";

interface UnlockCalendarProps {
	events: UnlockEvent[];
}

export function UnlockCalendar({ events }: UnlockCalendarProps) {
	if (events.length === 0) {
		return (
			<div className="py-8 text-center">
				<p className="text-sm text-smoke-dark">No upcoming unlocks</p>
			</div>
		);
	}

	const now = BigInt(Math.floor(Date.now() / 1000));

	return (
		<div>
			<h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-steel-white">
				<CalendarIcon className="size-4" />
				Upcoming Unlocks
			</h3>
			<div className="space-y-3">
				{events.map((event) => {
					const nextTimestamp = BigInt(Math.floor(new Date(event.nextUnlockDate).getTime() / 1000));
					const isCliffPending = new Date(event.cliffEnd) > new Date();
					const timeRemaining = nextTimestamp > now ? formatDuration(nextTimestamp - now) : "Ready";
					const eventLabel = isCliffPending
						? "Cliff ends"
						: event.vestingEnabled
							? "Fully vested"
							: "Unlocks";

					return (
						<div
							key={event.lockId}
							className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-steel-white">{event.tokenName}</span>
										<span className="text-xs text-smoke-dark">{event.tokenSymbol}</span>
										{isCliffPending && (
											<span className="rounded bg-yellow-600/20 px-1.5 py-0.5 text-[10px] text-yellow-500">
												Cliff
											</span>
										)}
										{!event.vestingEnabled && !isCliffPending && (
											<span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] text-blue-400">
												All-or-nothing
											</span>
										)}
									</div>
									<div className="mt-1 flex items-center gap-3 text-xs text-smoke-dark">
										<span>
											Beneficiary: <AddressDisplay address={event.beneficiary} />
										</span>
									</div>
								</div>
								<div className="text-right">
									<p className="font-mono text-sm text-steel-white">
										{formatSupply(BigInt(event.remainingAmount))}
									</p>
									<p className="mt-0.5 text-xs text-smoke-dark">
										{eventLabel}: {formatDate(event.nextUnlockDate)}
									</p>
								</div>
							</div>
							<div className="mt-2 flex items-center gap-1 text-xs text-smoke">
								<ClockIcon className="size-3" />
								{timeRemaining}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
