import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: resolve(import.meta.dirname, "../.."),
	},
	serverExternalPackages: ["postgres"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "esm.sh",
			},
		],
	},
};

export default nextConfig;
