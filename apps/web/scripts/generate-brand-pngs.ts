/**
 * One-shot script to rasterize /public/brand/*.svg into PNGs that X, Farcaster,
 * and other social platforms can actually upload. Run from apps/web:
 *
 *   pnpm tsx scripts/generate-brand-pngs.ts
 *
 * The generated PNGs are committed alongside the SVGs so consumers can
 * download them directly from forja.fun/brand/*.png without needing tools.
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

interface Target {
	svg: string;
	out: string;
	width: number;
	height: number;
	density?: number;
}

const BRAND_DIR = resolve(process.cwd(), "public/brand");

const TARGETS: Target[] = [
	// Logo — multiple sizes for different contexts
	{ svg: "logo.svg", out: "logo-512.png", width: 512, height: 512 },
	{ svg: "logo.svg", out: "logo-1024.png", width: 1024, height: 1024 },
	{ svg: "logo-mono-gold.svg", out: "logo-mono-gold-512.png", width: 512, height: 512 },
	{ svg: "logo-mono-light.svg", out: "logo-mono-light-512.png", width: 512, height: 512 },
	{ svg: "logo-mono-dark.svg", out: "logo-mono-dark-512.png", width: 512, height: 512 },

	// Wordmark + lockups
	{ svg: "wordmark.svg", out: "wordmark.png", width: 800, height: 240 },
	{ svg: "lockup-horizontal.svg", out: "lockup-horizontal.png", width: 1040, height: 240 },
	{ svg: "lockup-vertical.svg", out: "lockup-vertical.png", width: 800, height: 560 },

	// Social — platform-native dimensions
	{ svg: "x-avatar.svg", out: "x-avatar.png", width: 400, height: 400 },
	{ svg: "x-avatar.svg", out: "x-avatar-800.png", width: 800, height: 800 },
	{ svg: "x-banner.svg", out: "x-banner.png", width: 1500, height: 500 },
	{ svg: "farcaster-banner.svg", out: "farcaster-banner.png", width: 1500, height: 500 },
	{ svg: "og-template.svg", out: "og-template.png", width: 1200, height: 630 },
	{ svg: "palette.svg", out: "palette.png", width: 1200, height: 600 },
];

async function main() {
	console.log(`[brand] rasterizing ${TARGETS.length} assets from ${BRAND_DIR}\n`);

	let ok = 0;
	let failed = 0;

	for (const target of TARGETS) {
		const svgPath = resolve(BRAND_DIR, target.svg);
		const outPath = resolve(BRAND_DIR, target.out);

		try {
			const svg = await fs.readFile(svgPath);
			// density=300 gives high-DPI rasterization; sharp handles the final
			// resize with lanczos3 so edges stay crisp on both social avatars
			// (small) and high-res lockups.
			await sharp(svg, { density: target.density ?? 300 })
				.resize(target.width, target.height, {
					fit: "contain",
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				})
				.png({ compressionLevel: 9, adaptiveFiltering: true })
				.toFile(outPath);

			const stat = await fs.stat(outPath);
			console.log(
				`  ✓ ${target.out.padEnd(32)} ${`${target.width}×${target.height}`.padEnd(12)} ${(stat.size / 1024).toFixed(1)} KB`,
			);
			ok++;
		} catch (err) {
			console.error(`  ✗ ${target.out} — ${err instanceof Error ? err.message : err}`);
			failed++;
		}
	}

	console.log(`\n[brand] done — ${ok} ok, ${failed} failed`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	console.error("[brand] fatal:", err);
	process.exit(1);
});
