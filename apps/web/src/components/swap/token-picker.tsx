"use client";

import { CheckIcon, PlusIcon, SearchIcon, ZapIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { getOnchainTokenMetadata, getSwappableTokens } from "@/actions/swaps";
import { getTokenList } from "@/actions/token-hub";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageFallback } from "@/components/ui/image-fallback";
import { Input } from "@/components/ui/input";
import { PATHUSDC_ADDRESS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TokenOption {
	address: `0x${string}`;
	symbol: string;
	name: string;
	logoUrl?: string | null;
	decimals?: number;
}

const PATHUSDC_OPTION: TokenOption = {
	address: PATHUSDC_ADDRESS,
	symbol: "USDC",
	name: "Path USDC",
	logoUrl: null,
	decimals: 6,
};

interface TokenPickerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (token: TokenOption) => void;
	selectedAddress?: string;
	excludeAddress?: string;
}

export function TokenPicker({
	open,
	onOpenChange,
	onSelect,
	selectedAddress,
	excludeAddress,
}: TokenPickerProps) {
	const [search, setSearch] = useState("");
	const [tokens, setTokens] = useState<TokenOption[]>([PATHUSDC_OPTION]);
	const [isLoading, setIsLoading] = useState(false);
	const [importCandidate, setImportCandidate] = useState<TokenOption | null>(null);
	const [importStatus, setImportStatus] = useState<"idle" | "loading" | "error">("idle");
	const [swappable, setSwappable] = useState<Set<string>>(new Set());

	// Load swappable-token list once per mount. Used to badge tokens that
	// already have a discovered v4 pool so users don't pick a dead-end token.
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		(async () => {
			const list = await getSwappableTokens();
			if (!cancelled) setSwappable(new Set(list.map((a) => a.toLowerCase())));
		})();
		return () => {
			cancelled = true;
		};
	}, [open]);

	const isSwappable = useMemo(
		() => (addr: string) => swappable.has(addr.toLowerCase()),
		[swappable],
	);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setIsLoading(true);
		(async () => {
			try {
				const result = await getTokenList({
					search: search.trim() || undefined,
					sort: "holders",
					limit: 50,
				});
				if (cancelled) return;
				const apiTokens: TokenOption[] = result.tokens.map((t) => ({
					address: t.address as `0x${string}`,
					symbol: t.symbol ?? "?",
					name: t.name ?? "Unknown",
					logoUrl: t.logoUri,
					decimals: t.decimals ?? 6,
				}));

				// Always surface USDC at the top when no search or it matches.
				const matchesUsdc =
					!search.trim() ||
					"usdc".includes(search.trim().toLowerCase()) ||
					"path usdc".includes(search.trim().toLowerCase()) ||
					PATHUSDC_OPTION.address.toLowerCase() === search.trim().toLowerCase();
				const merged = matchesUsdc
					? [
							PATHUSDC_OPTION,
							...apiTokens.filter(
								(t) => t.address.toLowerCase() !== PATHUSDC_OPTION.address.toLowerCase(),
							),
						]
					: apiTokens;

				setTokens(merged);
			} catch (e) {
				console.error("[TokenPicker] failed to load tokens", e);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, search]);

	const filtered = tokens.filter(
		(t) => !excludeAddress || t.address.toLowerCase() !== excludeAddress.toLowerCase(),
	);

	// When the user pastes a 0x address that isn't already in the DB list,
	// fetch its on-chain metadata so they can pick it. This is essential on
	// Tempo because most pools are against non-TIP-20 ERC-20s we don't index.
	useEffect(() => {
		const q = search.trim();
		if (!isAddress(q)) {
			setImportCandidate(null);
			setImportStatus("idle");
			return;
		}
		const already = tokens.some((t) => t.address.toLowerCase() === q.toLowerCase());
		if (already) {
			setImportCandidate(null);
			setImportStatus("idle");
			return;
		}

		let cancelled = false;
		setImportStatus("loading");
		(async () => {
			const meta = await getOnchainTokenMetadata(q);
			if (cancelled) return;
			if (!meta) {
				setImportCandidate(null);
				setImportStatus("error");
				return;
			}
			setImportCandidate({
				address: meta.address as `0x${string}`,
				symbol: meta.symbol,
				name: meta.name,
				decimals: meta.decimals,
			});
			setImportStatus("idle");
		})();
		return () => {
			cancelled = true;
		};
	}, [search, tokens]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Select a token</DialogTitle>
				</DialogHeader>

				<div className="relative">
					<SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
					<Input
						autoFocus
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search name, symbol, or paste address"
						className="pl-9"
					/>
				</div>

				<div className="-mx-1 max-h-[60vh] overflow-y-auto pr-1">
					{isLoading && filtered.length === 0 && !importCandidate && (
						<p className="py-8 text-center text-sm text-text-tertiary">Loading…</p>
					)}
					{!isLoading && filtered.length === 0 && !importCandidate && (
						<p className="py-8 text-center text-sm text-text-tertiary">
							{importStatus === "loading"
								? "Fetching token…"
								: importStatus === "error"
									? "Could not read token metadata at that address"
									: isAddress(search.trim())
										? "No token found — not a valid ERC-20"
										: "No matches"}
						</p>
					)}

					{importCandidate && (
						<button
							type="button"
							onClick={() => {
								onSelect(importCandidate);
								onOpenChange(false);
							}}
							className="mb-1 flex w-full items-center gap-3 rounded-xl border border-dashed border-gold/40 bg-gold/5 px-3 py-2.5 text-left transition-colors hover:bg-gold/10"
						>
							<ImageFallback name={importCandidate.symbol} size={36} variant="circle" />
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="font-medium text-text-primary">{importCandidate.symbol}</span>
									<PlusIcon className="size-4 text-gold" />
									<span className="text-xs text-gold">Import</span>
								</div>
								<p className="truncate text-xs text-text-tertiary">{importCandidate.name}</p>
							</div>
						</button>
					)}
					{filtered.map((token) => {
						const isSelected = selectedAddress?.toLowerCase() === token.address.toLowerCase();
						return (
							<button
								type="button"
								key={token.address}
								onClick={() => {
									onSelect(token);
									onOpenChange(false);
								}}
								className={cn(
									"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-bg-field",
									isSelected && "bg-bg-field",
								)}
							>
								{token.logoUrl ? (
									<Image
										src={token.logoUrl}
										alt={token.symbol}
										width={36}
										height={36}
										className="size-9 rounded-full bg-bg-field object-cover"
										unoptimized
									/>
								) : (
									<ImageFallback name={token.symbol} size={36} variant="circle" />
								)}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-text-primary">{token.symbol}</span>
										{isSwappable(token.address) && (
											<span
												title="Has a Uniswap v4 pool"
												className="inline-flex items-center gap-0.5 rounded bg-indigo/15 px-1 py-px text-[10px] font-medium text-indigo"
											>
												<ZapIcon className="size-3" />
												Pool
											</span>
										)}
										{isSelected && <CheckIcon className="size-4 text-gold" />}
									</div>
									<p className="truncate text-xs text-text-tertiary">{token.name}</p>
								</div>
							</button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
