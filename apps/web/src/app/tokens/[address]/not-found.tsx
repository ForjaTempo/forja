import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export default function TokenNotFound() {
	return (
		<PageContainer className="py-16 text-center">
			<h1 className="text-2xl font-bold text-steel-white">Token Not Found</h1>
			<p className="mt-2 text-sm text-smoke-dark">
				The token you&apos;re looking for doesn&apos;t exist or hasn&apos;t been indexed yet.
			</p>
			<Link
				href="/tokens"
				className="mt-6 inline-block text-sm text-indigo transition-colors hover:text-indigo/80"
			>
				Back to Token Hub
			</Link>
		</PageContainer>
	);
}
