import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Token Lock",
	description: "Lock TIP-20 tokens with optional cliff and vesting schedules on Tempo",
};

export default function LockLayout({ children }: { children: React.ReactNode }) {
	return children;
}
