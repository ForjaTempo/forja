import type { Metadata } from "next";
import { LaunchCreateForm } from "@/components/launch/launch-create-form";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
	title: "Create Launch | FORJA",
	description: "Launch a new token on a bonding curve with automatic Uniswap v4 graduation.",
};

export default function LaunchCreatePage() {
	return (
		<PageContainer className="py-8 sm:py-12">
			<div className="mx-auto max-w-2xl space-y-8">
				<PageHeader
					title="Create Launch"
					description="Launch a new token with a bonding curve. Graduates to Uniswap v4 at $69,000."
				/>
				<LaunchCreateForm />
			</div>
		</PageContainer>
	);
}
