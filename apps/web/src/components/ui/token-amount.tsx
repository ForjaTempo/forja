import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

interface TokenAmountProps {
	amount: number | bigint;
	symbol?: string;
	decimals?: number;
	className?: string;
}

function formatCompactBigInt(raw: bigint, decimals: number): string {
	const str = formatUnits(raw, decimals);
	const dotIdx = str.indexOf(".");
	const intPart = dotIdx === -1 ? str : str.slice(0, dotIdx);
	const decPart = dotIdx === -1 ? "" : str.slice(dotIdx + 1);
	const n = BigInt(intPart);

	if (n >= 1_000_000_000n) {
		const whole = n / 1_000_000_000n;
		const frac = (n % 1_000_000_000n) / 100_000_000n;
		return `${whole}.${frac}B`;
	}
	if (n >= 1_000_000n) {
		const whole = n / 1_000_000n;
		const frac = (n % 1_000_000n) / 100_000n;
		return `${whole}.${frac}M`;
	}
	if (n >= 1_000n) {
		const whole = n / 1_000n;
		const frac = (n % 1_000n) / 100n;
		return `${whole}.${frac}K`;
	}

	if (decPart && decPart !== "0") {
		return `${intPart}.${decPart.slice(0, 2)}`;
	}
	return intPart;
}

function formatCompactNumber(value: number): string {
	if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function TokenAmount({ amount, symbol, decimals = 6, className }: TokenAmountProps) {
	const display =
		typeof amount === "bigint"
			? formatCompactBigInt(amount, decimals)
			: formatCompactNumber(amount);

	return (
		<span className={cn("inline-flex items-baseline gap-1 font-mono text-sm", className)}>
			<span>{display}</span>
			{symbol && <span className="text-xs text-smoke-dark">{symbol}</span>}
		</span>
	);
}
