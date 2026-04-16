import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { hasLaunchpad } from "@/lib/constants";
import { hasClaimer } from "@/lib/contracts";

const allProductLinks = [
	{ label: "Create", href: "/create" },
	{ label: "Multisend", href: "/multisend" },
	{ label: "Lock", href: "/lock" },
	{ label: "Claim", href: "/claim/create" },
	{ label: "Launchpad", href: "/launch" },
] as const;

const productLinks = allProductLinks.filter((link) => {
	if (link.href === "/claim/create" && !hasClaimer) return false;
	if (link.href === "/launch" && !hasLaunchpad) return false;
	return true;
});

const communityLinks = [
	{
		label: "Twitter / X",
		href: "https://x.com/ForjaTempo",
		external: true,
	},
	{
		label: "GitHub",
		href: "https://github.com/ForjaTempo/forja",
		external: true,
	},
] as const;

const networkLinks = [
	{
		label: "Tempo Explorer",
		href: "https://explore.tempo.xyz",
		external: true,
	},
] as const;

export function Footer() {
	return (
		<footer className="mt-auto">
			<Separator className="bg-anvil-gray-light" />
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				{/* Top — Branding */}
				<div className="mb-10">
					<p className="text-lg font-bold text-steel-white">FORJA</p>
					<p className="mt-1 text-sm text-smoke-dark">Token platform for Tempo</p>
				</div>

				{/* Columns */}
				<div className="grid gap-8 sm:grid-cols-3">
					{/* Product */}
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-smoke">Product</p>
						<ul className="mt-3 space-y-2">
							{productLinks.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-sm text-smoke-dark transition-colors hover:text-steel-white"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Community */}
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-smoke">Community</p>
						<ul className="mt-3 space-y-2">
							{communityLinks.map((link) => (
								<li key={link.href}>
									<a
										href={link.href}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-smoke-dark transition-colors hover:text-steel-white"
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</div>

					{/* Network */}
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-smoke">Network</p>
						<ul className="mt-3 space-y-2">
							{networkLinks.map((link) => (
								<li key={link.href}>
									<a
										href={link.href}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-smoke-dark transition-colors hover:text-steel-white"
									>
										{link.label}
									</a>
								</li>
							))}
							<li className="text-sm text-smoke-dark">Chain ID: 4217</li>
						</ul>
					</div>
				</div>

				{/* Bottom */}
				<Separator className="mt-10 bg-anvil-gray-light" />
				<p className="mt-6 text-center text-xs text-smoke-dark">
					&copy; 2026 FORJA. Built on Tempo.
				</p>
			</div>
		</footer>
	);
}
