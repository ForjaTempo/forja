import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: resolve(import.meta.dirname, "../.."),
	},
	serverExternalPackages: ["postgres", "sharp"],
	// Force deterministic CSS chunk ordering in production. Without this, Next 16
	// may split global + vendor CSS across chunks in an order that doesn't match
	// dev, causing cold-load FOUC on RainbowKit + Tailwind v4 combos.
	// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking
	experimental: {
		cssChunking: "strict",
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "esm.sh",
			},
			{
				protocol: "https",
				hostname: "forja.fun",
			},
			{
				protocol: "https",
				hostname: "tokenlist.tempo.xyz",
			},
		],
	},
};

export default nextConfig;
