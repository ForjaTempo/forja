"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { addToWatchlist, getWatchedTokenAddresses, removeFromWatchlist } from "@/actions/watchlist";
import { useAuthGate } from "@/contexts/auth-context";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
	tokenAddress: string;
	className?: string;
}

export function WatchlistButton({ tokenAddress, className }: WatchlistButtonProps) {
	const { address, isConnected } = useAccount();
	const queryClient = useQueryClient();
	const { withAuth } = useWalletAuth();
	const { isAuthed, requestAuth } = useAuthGate();

	const { data: watchedAddresses = [] } = useQuery({
		queryKey: ["watched-addresses", address],
		queryFn: () => getWatchedTokenAddresses(address as string),
		enabled: isConnected && !!address && isAuthed,
		staleTime: 30_000,
	});

	const isWatched = watchedAddresses.includes(tokenAddress.toLowerCase());

	const mutation = useMutation({
		mutationFn: async (currentlyWatched: boolean) => {
			if (!address) throw new Error("Not connected");
			if (currentlyWatched) {
				return withAuth(() => removeFromWatchlist(address, tokenAddress));
			}
			return withAuth(() => addToWatchlist(address, tokenAddress));
		},
		onSuccess: (result, currentlyWatched) => {
			if ("error" in result && typeof result.error === "string") {
				toast.error(result.error);
				return;
			}
			queryClient.invalidateQueries({ queryKey: ["watched-addresses", address] });
			queryClient.invalidateQueries({ queryKey: ["watchlist", address] });
			toast.success(currentlyWatched ? "Removed from watchlist" : "Added to watchlist");
		},
		onError: () => {
			toast.error("Failed to update watchlist");
		},
	});

	if (!isConnected) return null;

	const handleClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		let watched = isWatched;

		// If not authed, request auth and refetch watched state before deciding
		if (!isAuthed) {
			const ok = await requestAuth();
			if (!ok) return;

			const fresh = await queryClient.fetchQuery({
				queryKey: ["watched-addresses", address],
				queryFn: () => getWatchedTokenAddresses(address as string),
			});
			watched = fresh.includes(tokenAddress.toLowerCase());
		}

		mutation.mutate(watched);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={mutation.isPending}
			className={cn(
				"rounded-md p-1 transition-colors",
				isWatched
					? "text-molten-amber hover:text-molten-amber/70"
					: "text-smoke-dark hover:text-molten-amber",
				className,
			)}
			title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
		>
			<StarIcon className={cn("size-4", isWatched && "fill-current")} />
		</button>
	);
}
