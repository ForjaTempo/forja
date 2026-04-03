"use client";

import Link from "next/link";

export default function ErrorPage({
	error: _error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
			<div className="text-center">
				<p className="text-6xl font-bold text-molten-amber">Oops</p>
				<h1 className="mt-4 text-2xl font-semibold text-steel-white">Something went wrong</h1>
				<p className="mt-2 text-smoke">An unexpected error occurred. Please try again.</p>
				<div className="mt-8 flex items-center justify-center gap-4">
					<button
						type="button"
						onClick={reset}
						className="rounded-lg bg-molten-amber px-6 py-2.5 font-medium text-forge-black transition-colors hover:bg-molten-amber-hover"
					>
						Try Again
					</button>
					<Link
						href="/"
						className="rounded-lg border border-anvil-gray-light px-6 py-2.5 font-medium text-steel-white transition-colors hover:bg-anvil-gray"
					>
						Go Home
					</Link>
				</div>
			</div>
		</div>
	);
}
