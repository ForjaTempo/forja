import { ForjaLogo } from "@/components/shared/forja-logo";

export default function Loading() {
	return (
		<div className="flex flex-1 items-center justify-center py-24">
			<div className="flex items-center gap-3 animate-pulse">
				<ForjaLogo size={28} />
				<span className="gold-text font-display text-[28px] tracking-[-0.02em]">Forja</span>
			</div>
		</div>
	);
}
