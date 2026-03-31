"use client";

import {
	CheckCircleIcon,
	ExternalLinkIcon,
	LoaderIcon,
	RefreshCwIcon,
	XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useExplorerUrl } from "@/hooks/use-explorer-url";
import { cn } from "@/lib/utils";

export type TransactionState = "idle" | "waiting" | "pending" | "confirmed" | "failed";

interface TransactionStatusProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	state: TransactionState;
	txHash?: string;
	title?: string;
	error?: string;
	onRetry?: () => void;
}

const stateConfig = {
	idle: { icon: null, label: "" },
	waiting: {
		icon: <LoaderIcon className="size-8 animate-spin text-molten-amber" />,
		label: "Waiting for approval...",
	},
	pending: {
		icon: <LoaderIcon className="size-8 animate-spin text-molten-amber" />,
		label: "Transaction pending...",
	},
	confirmed: {
		icon: <CheckCircleIcon className="size-8 text-forge-green" />,
		label: "Transaction confirmed",
	},
	failed: {
		icon: <XCircleIcon className="size-8 text-ember-red" />,
		label: "Transaction failed",
	},
} as const;

export function TransactionStatus({
	open,
	onOpenChange,
	state,
	txHash,
	title = "Transaction",
	error,
	onRetry,
}: TransactionStatusProps) {
	const explorerUrl = useExplorerUrl();
	const config = stateConfig[state];
	const canClose = state === "confirmed" || state === "failed";

	return (
		<Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="sr-only">{config.label}</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4 py-6">
					{config.icon}
					<p
						className={cn(
							"text-sm font-medium",
							state === "confirmed" && "text-forge-green",
							state === "failed" && "text-ember-red",
							(state === "waiting" || state === "pending") && "text-smoke",
						)}
					>
						{config.label}
					</p>

					{txHash && (
						<a
							href={`${explorerUrl}/tx/${txHash}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 font-mono text-xs text-smoke-dark transition-colors hover:text-molten-amber"
						>
							{`${txHash.slice(0, 10)}...${txHash.slice(-8)}`}
							<ExternalLinkIcon className="size-3" />
						</a>
					)}

					{error && (
						<p className="max-w-full break-words text-center text-xs text-ember-red">{error}</p>
					)}
				</div>

				{canClose && (
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						{state === "failed" && onRetry && (
							<Button className="w-full" onClick={onRetry}>
								<RefreshCwIcon className="size-4" />
								Try Again
							</Button>
						)}
						<Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
							Close
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
