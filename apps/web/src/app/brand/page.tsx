import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
	title: "Brand kit",
	description:
		"Forja logo, wordmark, banners, and color palette. Vector SVG + high-resolution PNG. Free for press, integrations, and community.",
};

interface Asset {
	label: string;
	description: string;
	svg: string;
	png?: string;
	/** Tall/wide hint for the preview tile */
	aspect: "square" | "wide" | "tall";
	/** Tile background override — some marks look better on the dark page tint */
	bg?: string;
}

const MARKS: Asset[] = [
	{
		label: "Logo · gradient",
		description: "Primary mark — gold gradient + ember spark. Use on dark backgrounds.",
		svg: "/brand/logo.svg",
		png: "/brand/logo-1024.png",
		aspect: "square",
	},
	{
		label: "Logo · mono gold",
		description: "Solid-gold fill for single-color dark contexts.",
		svg: "/brand/logo-mono-gold.svg",
		png: "/brand/logo-mono-gold-512.png",
		aspect: "square",
	},
	{
		label: "Logo · mono light",
		description: "Off-white fill for press overlays on dark backgrounds.",
		svg: "/brand/logo-mono-light.svg",
		png: "/brand/logo-mono-light-512.png",
		aspect: "square",
	},
	{
		label: "Logo · mono dark",
		description: "Dark fill for light/paper backgrounds.",
		svg: "/brand/logo-mono-dark.svg",
		png: "/brand/logo-mono-dark-512.png",
		aspect: "square",
		bg: "#f5f5f0",
	},
];

const LOCKUPS: Asset[] = [
	{
		label: "Wordmark",
		description: "Forja text only, Instrument Serif gold-gradient.",
		svg: "/brand/wordmark.svg",
		png: "/brand/wordmark.png",
		aspect: "wide",
	},
	{
		label: "Horizontal lockup",
		description: "Mark + wordmark side-by-side. Default for headers, press.",
		svg: "/brand/lockup-horizontal.svg",
		png: "/brand/lockup-horizontal.png",
		aspect: "wide",
	},
	{
		label: "Vertical lockup",
		description: "Mark above wordmark, centered. Profile card, compact spaces.",
		svg: "/brand/lockup-vertical.svg",
		png: "/brand/lockup-vertical.png",
		aspect: "tall",
	},
];

const SOCIAL: Asset[] = [
	{
		label: "X · avatar",
		description: "400×400 profile picture for X / Twitter.",
		svg: "/brand/x-avatar.svg",
		png: "/brand/x-avatar.png",
		aspect: "square",
	},
	{
		label: "X · banner",
		description: "1500×500 header for X / Twitter.",
		svg: "/brand/x-banner.svg",
		png: "/brand/x-banner.png",
		aspect: "wide",
	},
	{
		label: "Farcaster · banner",
		description: "1500×500 banner for Warpcast / Farcaster.",
		svg: "/brand/farcaster-banner.svg",
		png: "/brand/farcaster-banner.png",
		aspect: "wide",
	},
	{
		label: "Open Graph · reference",
		description: "1200×630 share card reference. Runtime OG is dynamic via /opengraph-image.tsx.",
		svg: "/brand/og-template.svg",
		png: "/brand/og-template.png",
		aspect: "wide",
	},
];

const PALETTE = [
	{ token: "Gold", hex: "#F0D38A", role: "Primary CTA, brand mark, conversion" },
	{ token: "Ember", hex: "#FF6B3D", role: "Warning, claim heat, logo spark" },
	{ token: "Indigo", hex: "#818CF8", role: "Secondary action, lock accent, charts" },
	{ token: "Green", hex: "#4ADE80", role: "Success, dispatched, vested, live" },
	{ token: "Red", hex: "#F87171", role: "Error, revoke, wrong-network" },
	{ token: "Pink", hex: "#F472B6", role: "Launchpad accent, graduation gradient" },
];

const SURFACES = [
	{ token: "bg-page", hex: "#0B0B10" },
	{ token: "bg-void", hex: "#06060A" },
	{ token: "bg-elevated", hex: "#12121A" },
	{ token: "bg-card", hex: "#16161F" },
	{ token: "bg-field", hex: "#1C1C26" },
];

export default function BrandPage() {
	return (
		<PageContainer className="py-16 sm:py-20">
			<div className="mx-auto max-w-5xl space-y-16">
				<header className="space-y-3">
					<div className="inline-flex items-center gap-2.5 rounded-full border border-border-gold bg-[rgba(240,211,138,0.08)] py-1 pl-1 pr-3 text-[12px] text-gold">
						<span className="rounded-sm bg-gold px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#1a1307]">
							/BRAND
						</span>
						Forge-editorial identity
					</div>
					<h1
						className="m-0 font-display font-normal leading-[0.95] tracking-[-0.03em]"
						style={{ fontSize: "clamp(40px, 6.5vw, 76px)" }}
					>
						<span className="block">Press &amp; community kit.</span>
						<span className="gold-text block italic">Use freely.</span>
					</h1>
					<p className="max-w-2xl text-[14.5px] text-text-secondary">
						Every asset below is vector SVG plus a high-res PNG. Drop into X, Farcaster, or press
						packs directly — no conversion needed. Read{" "}
						<a href="/brand/BRAND.md" className="text-gold underline-offset-4 hover:underline">
							BRAND.md
						</a>{" "}
						for usage rules, palette, and typography.
					</p>
				</header>

				<Section title="Mark" eyebrow="Logo · 4 variants">
					<Gallery assets={MARKS} />
				</Section>

				<Section title="Wordmark &amp; lockups" eyebrow="Pairing the mark with type">
					<Gallery assets={LOCKUPS} />
				</Section>

				<Section title="Social" eyebrow="Ready-to-upload">
					<Gallery assets={SOCIAL} />
					<p className="mt-5 font-mono text-[11px] text-text-tertiary uppercase tracking-[0.14em]">
						X / Warpcast accept PNG uploads · use the PNG download buttons above
					</p>
				</Section>

				<Section title="Palette" eyebrow="Color tokens">
					<div className="space-y-6">
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
							{PALETTE.map((c) => (
								<div
									key={c.token}
									className="rounded-2xl border border-border-hair bg-bg-elevated p-4"
								>
									<div className="mb-3 h-16 rounded-lg" style={{ background: c.hex }} />
									<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
										{c.token}
									</div>
									<div className="mt-1 font-mono text-[12px] text-text-primary">{c.hex}</div>
									<p className="mt-1.5 text-[11.5px] text-text-tertiary leading-snug">{c.role}</p>
								</div>
							))}
						</div>

						<div>
							<div className="mb-3 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
								Surface stack · 5-tier depth
							</div>
							<div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-hair sm:grid-cols-5">
								{SURFACES.map((s) => (
									<div key={s.token} className="p-4" style={{ background: s.hex }}>
										<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
											{s.token}
										</div>
										<div className="mt-1 font-mono text-[11px] text-text-secondary">{s.hex}</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</Section>

				<Section title="Typography" eyebrow="Three families, clear roles">
					<div className="grid gap-4 sm:grid-cols-3">
						<TypeCard
							family="Instrument Serif"
							sample="Forge tokens"
							description="Display headlines, italic gold accent words"
							href="https://fonts.google.com/specimen/Instrument+Serif"
							previewClass="font-display text-[42px] leading-[1] tracking-[-0.02em] text-text-primary"
						/>
						<TypeCard
							family="Geist"
							sample="Create. Send. Lock."
							description="Body, UI, buttons"
							href="https://fonts.google.com/specimen/Geist"
							previewClass="font-sans text-[20px] font-medium text-text-primary"
						/>
						<TypeCard
							family="JetBrains Mono"
							sample="0x1234…abcd"
							description="Addresses, numbers, mono eyebrows"
							href="https://fonts.google.com/specimen/JetBrains+Mono"
							previewClass="font-mono text-[18px] text-text-primary"
						/>
					</div>
				</Section>

				<Section title="Download everything" eyebrow="Archive · links">
					<div className="grid gap-3 rounded-2xl border border-border-hair bg-bg-elevated p-5 sm:grid-cols-2">
						<DownloadLink href="/brand/BRAND.md" label="BRAND.md — usage rules" />
						<DownloadLink href="/brand/logo.svg" label="logo.svg (primary mark)" />
						<DownloadLink href="/brand/x-banner.png" label="x-banner.png (1500×500)" />
						<DownloadLink href="/brand/x-avatar.png" label="x-avatar.png (400×400)" />
						<DownloadLink href="/brand/og-template.png" label="og-template.png (1200×630)" />
						<DownloadLink href="/brand/palette.png" label="palette.png (reference)" />
					</div>
					<p className="mt-3 font-mono text-[11px] text-text-tertiary">
						All assets live under{" "}
						<a href="/brand/" className="text-gold underline-offset-4 hover:underline">
							forja.fun/brand/
						</a>{" "}
						— direct hot-link friendly.
					</p>
				</Section>

				<div className="border-border-hair border-t pt-6 font-mono text-[11px] text-text-tertiary">
					Contact · security@forja.fun · brand-kit v1.0
				</div>
			</div>
		</PageContainer>
	);
}

function Section({
	title,
	eyebrow,
	children,
}: {
	title: string;
	eyebrow: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-5">
			<div className="space-y-1.5">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					{eyebrow}
				</div>
				<h2 className="m-0 font-display text-[28px] tracking-[-0.01em] text-text-primary sm:text-[32px]">
					{title}
				</h2>
			</div>
			{children}
		</section>
	);
}

function Gallery({ assets }: { assets: Asset[] }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{assets.map((asset) => (
				<article
					key={asset.svg}
					className="overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated"
				>
					<div
						className="flex items-center justify-center p-8"
						style={{
							minHeight: asset.aspect === "tall" ? 260 : asset.aspect === "wide" ? 160 : 200,
							background:
								asset.bg ??
								"radial-gradient(circle at 50% 50%, rgba(240,211,138,0.08), transparent 65%), var(--color-bg-void)",
						}}
					>
						{/* biome-ignore lint/performance/noImgElement: brand SVGs are lightweight and display as-is */}
						<img
							src={asset.svg}
							alt={asset.label}
							className="max-h-[180px] w-auto max-w-full"
							style={{ maxWidth: asset.aspect === "wide" ? "80%" : "60%" }}
						/>
					</div>
					<div className="space-y-2 border-border-hair border-t p-5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="font-display text-[18px] tracking-[-0.01em] text-text-primary">
									{asset.label}
								</div>
								<p className="mt-1 text-[12.5px] text-text-tertiary">{asset.description}</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2 pt-1">
							<a
								href={asset.svg}
								download
								className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 font-mono text-[10.5px] text-text-secondary uppercase tracking-[0.1em] transition-colors hover:border-gold/40 hover:text-gold"
							>
								<DownloadIcon className="size-3" />
								SVG
							</a>
							{asset.png && (
								<a
									href={asset.png}
									download
									className="inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 font-mono text-[10.5px] text-text-secondary uppercase tracking-[0.1em] transition-colors hover:border-gold/40 hover:text-gold"
								>
									<DownloadIcon className="size-3" />
									PNG
								</a>
							)}
						</div>
					</div>
				</article>
			))}
		</div>
	);
}

function TypeCard({
	family,
	sample,
	description,
	href,
	previewClass,
}: {
	family: string;
	sample: string;
	description: string;
	href: string;
	previewClass: string;
}) {
	return (
		<div className="space-y-3 rounded-2xl border border-border-hair bg-bg-elevated p-5">
			<div className={previewClass}>{sample}</div>
			<div className="space-y-1 border-border-hair border-t pt-3">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					{family}
				</div>
				<p className="text-[12px] text-text-tertiary">{description}</p>
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 font-mono text-[11px] text-gold transition-colors hover:underline"
				>
					Google Fonts <ExternalLinkIcon className="size-3" />
				</a>
			</div>
		</div>
	);
}

function DownloadLink({ href, label }: { href: string; label: string }) {
	return (
		<a
			href={href}
			download
			className="inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-field px-3 py-2.5 font-mono text-[12px] text-text-secondary transition-colors hover:border-gold/40 hover:text-gold"
		>
			<DownloadIcon className="size-3.5" />
			{label}
		</a>
	);
}
