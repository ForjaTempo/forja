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
			<div className="rounded-2xl border border-border-hair bg-bg-elevated p-10 text-center">
				<p className="text-[13px] text-text-tertiary">No upcoming unlocks.</p>
			</div>
		);
	}

	const now = BigInt(Math.floor(Date.now() / 1000));

	return (
		<div className="rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div className="mb-4 flex items-center gap-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				<CalendarIcon className="size-3.5" />
				Upcoming unlocks
			</div>
			<div className="space-y-3">
				{events.map((event) => {
					const nextTimestamp = BigInt(Math.floor(new Date(event.nextUnlockDate).getTime() / 1000));
					const isCliffPending = new Date(event.cliffEnd) > new Date();
					const timeRemaining = nextTimestamp > now ? formatDuration(nextTimestamp - now) : "Ready";
					const eventLabel =
						event.vestingEnabled && isCliffPending
							? "Cliff ends"
							: event.vestingEnabled
								? "Fully vested"
								: "Unlocks";

					return (
						<div
							key={event.lockId}
							className="rounded-xl border border-border-hair bg-bg-field/60 p-4 transition-colors hover:border-border-subtle"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-display text-[15px] tracking-[-0.01em] text-text-primary">
											{event.tokenName}
										</span>
										<span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-gold uppercase tracking-[0.1em]">
											{event.tokenSymbol}
										</span>
										{event.vestingEnabled && isCliffPending && (
											<span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[10px] text-gold uppercase tracking-[0.1em]">
												Cliff
											</span>
										)}
										{!event.vestingEnabled && (
											<span className="inline-flex items-center rounded-full border border-indigo/30 bg-indigo/10 px-2 py-0.5 font-mono text-[10px] text-indigo uppercase tracking-[0.1em]">
												All-or-nothing
											</span>
										)}
									</div>
									<div className="mt-1 flex items-center gap-1.5 text-[12px] text-text-tertiary">
										Beneficiary <AddressDisplay address={event.beneficiary} />
									</div>
								</div>
								<div className="text-right">
									<p className="font-mono text-[14px] text-text-primary">
										{formatSupply(BigInt(event.remainingAmount))}
									</p>
									<p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
										{eventLabel} · {formatDate(event.nextUnlockDate)}
									</p>
								</div>
							</div>
							<div className="mt-3 inline-flex items-center gap-1.5 border-border-hair border-t pt-2.5 font-mono text-[11px] text-text-secondary">
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
