import { cn } from "@/lib/utils";

interface TokenAmountProps {
	amount: number | bigint;
	symbol?: string;
	decimals?: number;
	className?: string;
}

function formatCompact(value: number): string {
	if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function TokenAmount({
	amount,
	symbol,
	decimals = 6,
	className,
}: TokenAmountProps) {
	const value = typeof amount === "bigint" ? Number(amount) / 10 ** decimals : amount;

	return (
		<span className={cn("inline-flex items-baseline gap-1 font-mono text-sm", className)}>
			<span>{formatCompact(value)}</span>
			{symbol && <span className="text-xs text-smoke-dark">{symbol}</span>}
		</span>
	);
}
