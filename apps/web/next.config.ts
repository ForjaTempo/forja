import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: resolve(import.meta.dirname, "../.."),
	},
	serverExternalPackages: ["postgres"],
};

export default nextConfig;
