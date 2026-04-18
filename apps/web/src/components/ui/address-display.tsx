"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { cn } from "@/lib/utils";

interface AddressDisplayProps {
	address: string;
	showExplorer?: boolean;
	className?: string;
}

export function AddressDisplay({ address, showExplorer = false, className }: AddressDisplayProps) {
	const explorerUrl = useExplorerUrl();
	const [copied, setCopied] = useState(false);
	const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(address);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [address]);

	return (
		<span className={cn("inline-flex items-center gap-1.5", className)}>
			<button
				type="button"
				onClick={handleCopy}
				className="inline-flex items-center gap-1 font-mono text-sm text-text-secondary transition-colors hover:text-text-primary"
				title="Copy address"
			>
				{short}
				{copied ? <CheckIcon className="size-3 text-green" /> : <CopyIcon className="size-3" />}
			</button>

			{showExplorer && (
				<a
					href={`${explorerUrl}/address/${address}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-text-tertiary transition-colors hover:text-indigo"
					title="View on explorer"
				>
					<ExternalLinkIcon className="size-3" />
				</a>
			)}
		</span>
	);
}
