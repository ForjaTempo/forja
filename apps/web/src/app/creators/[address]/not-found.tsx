import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export default function CreatorNotFound() {
	return (
		<PageContainer className="py-16 text-center">
			<h1 className="text-2xl font-bold text-steel-white">Creator Not Found</h1>
			<p className="mt-2 text-sm text-smoke-dark">
				This address hasn&apos;t created any tokens through FORJA yet.
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
