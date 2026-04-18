import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export default function CreatorNotFound() {
	return (
		<PageContainer className="py-24">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-hair bg-bg-elevated p-10 text-center">
				<div className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
					Not found
				</div>
				<h1 className="font-display text-[26px] leading-[1.1] tracking-[-0.02em] text-text-primary">
					No creator here <span className="gold-text italic">yet.</span>
				</h1>
				<p className="text-[13.5px] text-text-tertiary">
					This address hasn't created any tokens through FORJA yet.
				</p>
				<Link
					href="/tokens"
					className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border-hair bg-bg-field px-4 py-2.5 font-medium text-[13px] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
				>
					Back to token hub
				</Link>
			</div>
		</PageContainer>
	);
}
