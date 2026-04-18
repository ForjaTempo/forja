"use client";

import { GlobeIcon, MessageCircleIcon, XIcon as TwitterIcon } from "lucide-react";
import { ExternalLinkGuard } from "@/components/shared/external-link-guard";
import { ImageFallback } from "@/components/ui/image-fallback";

interface ProfilePreviewProps {
	address: string;
	displayName: string;
	bio: string;
	avatarUrl: string;
	bannerUrl: string;
	website: string;
	twitterHandle: string;
	telegramHandle: string;
}

function shortAddress(addr: string): string {
	return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const chipCls =
	"inline-flex items-center gap-1.5 rounded-lg border border-border-hair bg-bg-field px-2.5 py-1 font-medium text-[11px] text-text-secondary transition-colors hover:border-border-subtle hover:text-gold";

export function ProfilePreview(props: ProfilePreviewProps) {
	const {
		address,
		displayName,
		bio,
		avatarUrl,
		bannerUrl,
		website,
		twitterHandle,
		telegramHandle,
	} = props;

	const displayLabel = displayName || shortAddress(address);

	return (
		<div className="space-y-3">
			<p className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
				Live preview
			</p>

			<div className="overflow-hidden rounded-2xl border border-border-hair bg-bg-elevated">
				<div className="relative h-28 w-full">
					{bannerUrl ? (
						// biome-ignore lint/performance/noImgElement: local preview of uploaded image
						<img src={bannerUrl} alt="Banner preview" className="h-full w-full object-cover" />
					) : (
						<div
							className="h-full w-full"
							style={{
								background:
									"linear-gradient(135deg, rgba(129,140,248,0.25), rgba(240,211,138,0.12), rgba(255,107,61,0.08))",
							}}
						/>
					)}
				</div>

				<div className="-mt-8 px-4 pb-5">
					<div className="flex items-end gap-3">
						<div className="shrink-0 rounded-full border-4 border-bg-elevated bg-bg-elevated">
							{avatarUrl ? (
								// biome-ignore lint/performance/noImgElement: local preview
								<img
									src={avatarUrl}
									alt="Avatar preview"
									className="size-16 rounded-full object-cover"
								/>
							) : (
								<ImageFallback name={displayLabel} size={64} variant="circle" />
							)}
						</div>
					</div>

					<div className="mt-3">
						<h3 className="font-display text-[20px] tracking-[-0.01em] text-text-primary">
							{displayLabel}
						</h3>
						<p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
							{shortAddress(address)}
						</p>
					</div>

					{bio && (
						<p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-text-secondary">
							{bio}
						</p>
					)}

					{(website || twitterHandle || telegramHandle) && (
						<div className="mt-3 flex flex-wrap gap-1.5">
							{website && (
								<ExternalLinkGuard
									href={website.startsWith("http") ? website : `https://${website}`}
									className={chipCls}
								>
									<GlobeIcon className="size-3" />
									Website
								</ExternalLinkGuard>
							)}
							{twitterHandle && (
								<SocialChip
									href={`https://x.com/${twitterHandle.replace(/^@/, "")}`}
									icon={<TwitterIcon className="size-3" />}
									label={`@${twitterHandle.replace(/^@/, "")}`}
								/>
							)}
							{telegramHandle && (
								<SocialChip
									href={
										telegramHandle.startsWith("http")
											? telegramHandle
											: `https://t.me/${telegramHandle.replace(/^@/, "")}`
									}
									icon={<MessageCircleIcon className="size-3" />}
									label="Telegram"
								/>
							)}
						</div>
					)}
				</div>
			</div>

			<p className="text-[11px] leading-relaxed text-text-tertiary">
				This is how your profile appears to others on FORJA. Click save to publish.
			</p>
		</div>
	);
}

function SocialChip({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" className={chipCls}>
			{icon}
			{label}
		</a>
	);
}
