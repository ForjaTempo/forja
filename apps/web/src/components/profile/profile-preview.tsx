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
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

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
			<p className="text-xs font-medium uppercase tracking-wider text-smoke-dark">Live Preview</p>

			<div className="overflow-hidden rounded-xl border border-anvil-gray-light bg-deep-charcoal">
				{/* Banner */}
				<div className="relative h-28 w-full">
					{bannerUrl ? (
						// biome-ignore lint/performance/noImgElement: local preview of uploaded image
						<img src={bannerUrl} alt="Banner preview" className="h-full w-full object-cover" />
					) : (
						<div className="h-full w-full bg-gradient-to-br from-indigo/30 via-anvil-gray to-obsidian-black" />
					)}
				</div>

				{/* Avatar overlap */}
				<div className="-mt-8 px-4 pb-4">
					<div className="flex items-end gap-3">
						<div className="shrink-0 rounded-full border-4 border-deep-charcoal bg-deep-charcoal">
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
						<h3 className="text-base font-semibold text-steel-white">{displayLabel}</h3>
						<p className="font-mono text-xs text-smoke-dark">{shortAddress(address)}</p>
					</div>

					{bio && <p className="mt-3 text-sm leading-relaxed text-smoke line-clamp-4">{bio}</p>}

					{(website || twitterHandle || telegramHandle) && (
						<div className="mt-3 flex flex-wrap gap-2">
							{website && (
								<ExternalLinkGuard
									href={website.startsWith("http") ? website : `https://${website}`}
									className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray/40 px-2.5 py-1 text-xs text-smoke hover:border-indigo/50 hover:text-indigo"
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

			<p className="text-[11px] leading-relaxed text-smoke-dark/80">
				This is how your profile appears to others on FORJA. Click Save to publish.
			</p>
		</div>
	);
}

function SocialChip({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1.5 rounded-md border border-anvil-gray-light bg-anvil-gray/40 px-2.5 py-1 text-xs text-smoke hover:border-indigo/50 hover:text-indigo"
		>
			{icon}
			{label}
		</a>
	);
}
