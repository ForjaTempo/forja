import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: resolve(import.meta.dirname, "../.."),
	},
	serverExternalPackages: ["postgres", "sharp"],
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
