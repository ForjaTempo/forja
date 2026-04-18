import Link from "next/link";
import { ForjaLogo } from "@/components/shared/forja-logo";
import { hasLaunchpad, hasSwap } from "@/lib/constants";
import { hasClaimer } from "@/lib/contracts";

const allToolsLinks = [
	{ label: "Create", href: "/create" },
	{ label: "Multisend", href: "/multisend" },
	{ label: "Lock", href: "/lock" },
	{ label: "Claim", href: "/claim/create" },
	{ label: "Launchpad", href: "/launch" },
	{ label: "Swap", href: "/swap" },
	{ label: "Tokens", href: "/tokens" },
] as const;

const toolsLinks = allToolsLinks.filter((link) => {
	if (link.href === "/claim/create" && !hasClaimer) return false;
	if (link.href === "/launch" && !hasLaunchpad) return false;
	if (link.href === "/swap" && !hasSwap) return false;
	return true;
});

const discoverLinks: Array<{ label: string; href: string; external?: boolean }> = [
	{ label: "Trending", href: "/tokens?sort=trending" },
	{ label: "New launches", href: "/launch" },
	{ label: "Creators", href: "/tokens?source=forja" },
];

const buildLinks: Array<{ label: string; href: string; external?: boolean }> = [
	{ label: "GitHub", href: "https://github.com/ForjaTempo/forja", external: true },
	{ label: "Contracts", href: "/security", external: false },
	{ label: "security.txt", href: "/.well-known/security.txt", external: true },
];

const connectLinks: Array<{ label: string; href: string; external?: boolean }> = [
	{ label: "Twitter / X", href: "https://x.com/ForjaTempo", external: true },
	{ label: "Tempo Explorer", href: "https://explore.tempo.xyz", external: true },
];

type FooterLink = { label: string; href: string; external?: boolean };

const columns: Array<{ title: string; links: FooterLink[] }> = [
	{ title: "Tools", links: toolsLinks.map((l) => ({ label: l.label, href: l.href })) },
	{ title: "Discover", links: discoverLinks },
	{ title: "Build", links: buildLinks },
	{ title: "Connect", links: connectLinks },
];

function FooterLink({ label, href, external }: FooterLink) {
	if (external) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
			>
				{label}
			</a>
		);
	}
	return (
		<Link
			href={href}
			className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
		>
			{label}
		</Link>
	);
}

export function Footer() {
	return (
		<footer className="relative mt-24 overflow-hidden border-t border-border-hair">
			<div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
				<div className="grid gap-10 sm:gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
					<div>
						<div className="mb-5 flex items-center gap-2.5">
							<ForjaLogo size={32} />
							<span className="font-display text-[28px] tracking-[-0.02em]">Forja</span>
						</div>
						<p className="max-w-[340px] text-[14px] leading-[1.6] text-text-secondary">
							The token forge for Tempo. Create, distribute, lock, claim, launch and trade — all on
							the payments-first blockchain incubated by Stripe and Paradigm.
						</p>
					</div>
					{columns.map((col) => (
						<div key={col.title}>
							<div className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
								{col.title}
							</div>
							<ul className="flex flex-col gap-3">
								{col.links.map((link) => (
									<li key={`${col.title}-${link.href}`}>
										<FooterLink {...link} />
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="mt-16 flex flex-col items-start gap-6 border-border-hair border-t pt-10 sm:mt-20 sm:flex-row sm:items-end sm:justify-between">
					<div
						aria-hidden
						className="pointer-events-none flex-1 select-none overflow-hidden font-display text-[clamp(64px,14vw,200px)] leading-[0.85] tracking-[-0.05em]"
						style={{
							background:
								"linear-gradient(180deg, rgba(240,211,138,0.9) 0%, rgba(240,211,138,0.1) 70%, transparent 100%)",
							WebkitBackgroundClip: "text",
							backgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						Forja
					</div>
					<div className="flex shrink-0 flex-col items-start gap-2 sm:items-end sm:pb-5">
						<div className="font-mono text-[12px] text-text-tertiary">
							© 2026 — All rights forged
						</div>
						<div className="text-[12px] text-text-tertiary">Built on Tempo · Open source</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
