import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Creator Dashboard | FORJA",
	description:
		"Track your token performance, holder growth, transfer volume, and unlock schedules on FORJA.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return children;
}
