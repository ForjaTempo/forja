import { formatDate } from "@/lib/format";

interface VestingPreviewProps {
	amount: string;
	lockDurationDays: number;
	cliffDurationDays: number;
	vestingEnabled: boolean;
	tokenSymbol: string | undefined;
}

export function VestingPreview({
	amount,
	lockDurationDays,
	cliffDurationDays,
	vestingEnabled,
	tokenSymbol,
}: VestingPreviewProps) {
	if (lockDurationDays <= 0 || !amount || Number(amount) <= 0) return null;

	const now = new Date();
	const cliffEnd = new Date(now.getTime() + cliffDurationDays * 86400 * 1000);
	const lockEnd = new Date(now.getTime() + lockDurationDays * 86400 * 1000);
	const cliffPercent = lockDurationDays > 0 ? (cliffDurationDays / lockDurationDays) * 100 : 0;

	const symbol = tokenSymbol ?? "tokens";
	const numAmount = Number(amount);
	const vestingRate =
		vestingEnabled && lockDurationDays > 0 ? (numAmount / lockDurationDays).toFixed(2) : null;

	return (
		<div className="space-y-3 rounded-xl border border-border-hair bg-bg-field/60 p-4">
			<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				Lock preview
			</div>

			<div className="relative h-2.5 w-full overflow-hidden rounded-full bg-bg-elevated">
				{cliffPercent > 0 && (
					<div
						className="absolute inset-y-0 left-0 rounded-l-full bg-[rgba(240,211,138,0.25)]"
						style={{ width: `${Math.min(cliffPercent, 100)}%` }}
					/>
				)}
				<div
					className="absolute inset-y-0 rounded-r-full"
					style={{
						left: `${Math.min(cliffPercent, 100)}%`,
						width: `${Math.max(100 - cliffPercent, 0)}%`,
						background: "linear-gradient(90deg, rgba(129,140,248,0.7), rgba(129,140,248,0.4))",
					}}
				/>
			</div>

			<div className="space-y-1.5 text-[12.5px]">
				{cliffDurationDays > 0 && (
					<div className="flex items-center justify-between">
						<span className="text-text-tertiary">Cliff ends</span>
						<span className="text-text-primary">{formatDate(cliffEnd)}</span>
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className="text-text-tertiary">Fully unlocked</span>
					<span className="text-text-primary">{formatDate(lockEnd)}</span>
				</div>
				{vestingEnabled && vestingRate && (
					<div className="flex items-center justify-between">
						<span className="text-text-tertiary">Vesting rate</span>
						<span className="font-mono text-text-primary">
							~{vestingRate} {symbol}/day
						</span>
					</div>
				)}
				{!vestingEnabled && (
					<div className="flex items-center justify-between">
						<span className="text-text-tertiary">Unlock type</span>
						<span className="text-text-primary">Full unlock at end</span>
					</div>
				)}
			</div>
		</div>
	);
}
