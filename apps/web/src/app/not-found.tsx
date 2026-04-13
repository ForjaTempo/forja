import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
			<div className="text-center">
				<p className="text-8xl font-bold text-indigo">404</p>
				<h1 className="mt-4 text-2xl font-semibold text-steel-white">Page Not Found</h1>
				<p className="mt-2 text-smoke">The page you are looking for does not exist.</p>
				<nav className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Link
						href="/"
						className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						Home
					</Link>
					<Link
						href="/create"
						className="rounded-lg border border-anvil-gray-light px-6 py-2.5 font-medium text-steel-white transition-colors hover:bg-anvil-gray"
					>
						Create
					</Link>
					<Link
						href="/multisend"
						className="rounded-lg border border-anvil-gray-light px-6 py-2.5 font-medium text-steel-white transition-colors hover:bg-anvil-gray"
					>
						Multisend
					</Link>
					<Link
						href="/lock"
						className="rounded-lg border border-anvil-gray-light px-6 py-2.5 font-medium text-steel-white transition-colors hover:bg-anvil-gray"
					>
						Lock
					</Link>
				</nav>
			</div>
		</div>
	);
}
