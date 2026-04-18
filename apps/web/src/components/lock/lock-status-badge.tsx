import type { LockStatus } from "@/lib/lock-utils";

const STATUS_CONFIG: Record<LockStatus, { label: string; className: string }> = {
	locked: {
		label: "Locked",
		className: "border-border-hair bg-bg-field text-text-secondary",
	},
	cliffing: {
		label: "Cliff",
		className: "border-gold/30 bg-gold/10 text-gold",
	},
	vesting: {
		label: "Vesting",
		className: "border-indigo/30 bg-indigo/10 text-indigo",
	},
	"fully-vested": {
		label: "Fully vested",
		className: "border-green/30 bg-green/10 text-green",
	},
	claimed: {
		label: "Claimed",
		className: "border-green/30 bg-green/10 text-green",
	},
	revoked: {
		label: "Revoked",
		className: "border-red/30 bg-red/10 text-red",
	},
};

interface LockStatusBadgeProps {
	status: LockStatus;
}

export function LockStatusBadge({ status }: LockStatusBadgeProps) {
	const config = STATUS_CONFIG[status];
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${config.className}`}
		>
			{config.label}
		</span>
	);
}
