import { Badge } from "@/components/ui/badge";
import type { LockStatus } from "@/lib/lock-utils";

const STATUS_CONFIG: Record<LockStatus, { label: string; className: string }> = {
	locked: {
		label: "Locked",
		className: "border-smoke-dark/30 bg-smoke-dark/10 text-smoke-dark",
	},
	cliffing: {
		label: "Cliff",
		className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
	},
	vesting: {
		label: "Vesting",
		className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
	},
	"fully-vested": {
		label: "Fully Vested",
		className: "border-forge-green/30 bg-forge-green/10 text-forge-green",
	},
	claimed: {
		label: "Claimed",
		className: "border-forge-green/30 bg-forge-green/10 text-forge-green",
	},
	revoked: {
		label: "Revoked",
		className: "border-ember-red/30 bg-ember-red/10 text-ember-red",
	},
};

interface LockStatusBadgeProps {
	status: LockStatus;
}

export function LockStatusBadge({ status }: LockStatusBadgeProps) {
	const config = STATUS_CONFIG[status];
	return (
		<Badge variant="outline" className={config.className}>
			{config.label}
		</Badge>
	);
}
