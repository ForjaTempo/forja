import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasLaunchpad } from "@/lib/constants";

export const metadata: Metadata = {
	title: "Launch | FORJA",
	description:
		"Launch tokens on a bonding curve with automatic Uniswap v4 graduation on Tempo blockchain.",
};

export default function LaunchLayout({ children }: { children: ReactNode }) {
	if (!hasLaunchpad) redirect("/");
	return children;
}
