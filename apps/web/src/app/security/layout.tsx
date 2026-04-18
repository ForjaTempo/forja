import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Security Policy",
	description: "FORJA vulnerability disclosure policy, scope, and contact.",
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
	return children;
}
