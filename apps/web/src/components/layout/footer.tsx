import { Separator } from "@/components/ui/separator";

export function Footer() {
	return (
		<footer className="mt-auto">
			<Separator className="bg-anvil-gray-light" />
			<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
				<p className="text-sm text-smoke-dark">Built on Tempo</p>
				<div className="flex items-center gap-6">
					<a
						href="https://github.com/ForjaTempo/forja"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-smoke-dark transition-colors hover:text-steel-white"
					>
						GitHub
					</a>
					<a
						href="https://explore.tempo.xyz"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-smoke-dark transition-colors hover:text-steel-white"
					>
						Explorer
					</a>
				</div>
				<p className="text-sm text-smoke-dark">&copy; 2026 FORJA</p>
			</div>
		</footer>
	);
}
