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
		<div className="space-y-3 rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
			<p className="text-xs font-medium text-smoke">Lock Preview</p>

			{/* Progress bar */}
			<div className="relative h-3 w-full overflow-hidden rounded-full bg-anvil-gray">
				{cliffPercent > 0 && (
					<div
						className="absolute inset-y-0 left-0 rounded-l-full bg-amber-500/30"
						style={{ width: `${Math.min(cliffPercent, 100)}%` }}
					/>
				)}
				<div
					className="absolute inset-y-0 rounded-r-full bg-molten-amber/60"
					style={{
						left: `${Math.min(cliffPercent, 100)}%`,
						width: `${Math.max(100 - cliffPercent, 0)}%`,
					}}
				/>
			</div>

			{/* Details */}
			<div className="space-y-1.5 text-xs">
				{cliffDurationDays > 0 && (
					<div className="flex items-center justify-between">
						<span className="text-smoke-dark">Cliff ends</span>
						<span className="text-smoke">{formatDate(cliffEnd)}</span>
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className="text-smoke-dark">Fully unlocked</span>
					<span className="text-smoke">{formatDate(lockEnd)}</span>
				</div>
				{vestingEnabled && vestingRate && (
					<div className="flex items-center justify-between">
						<span className="text-smoke-dark">Vesting rate</span>
						<span className="font-mono text-smoke">
							~{vestingRate} {symbol}/day
						</span>
					</div>
				)}
				{!vestingEnabled && (
					<div className="flex items-center justify-between">
						<span className="text-smoke-dark">Unlock type</span>
						<span className="text-smoke">Full unlock at end</span>
					</div>
				)}
			</div>
		</div>
	);
}
