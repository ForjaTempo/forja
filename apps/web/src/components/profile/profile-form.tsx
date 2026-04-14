"use client";

import type { CreatorProfile } from "@forja/db";
import { GlobeIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { upsertCreatorProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { ImageFallback } from "@/components/ui/image-fallback";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { cn } from "@/lib/utils";

const MAX_BIO = 280;

interface ProfileFormProps {
	address: string;
	existing: CreatorProfile | null;
}

export function ProfileForm({ address, existing }: ProfileFormProps) {
	const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
	const [bio, setBio] = useState(existing?.bio ?? "");
	const [avatarUrl, setAvatarUrl] = useState(existing?.avatarUrl ?? "");
	const [bannerUrl, setBannerUrl] = useState(existing?.bannerUrl ?? "");
	const [website, setWebsite] = useState(existing?.website ?? "");
	const [twitterHandle, setTwitterHandle] = useState(existing?.twitterHandle ?? "");
	const [telegramHandle, setTelegramHandle] = useState(existing?.telegramHandle ?? "");
	const [saving, setSaving] = useState(false);
	const { ensureAuth, withAuth } = useWalletAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);

		const result = await withAuth(() =>
			upsertCreatorProfile(address, {
				displayName,
				bio,
				avatarUrl,
				bannerUrl,
				website,
				twitterHandle,
				telegramHandle,
			}),
		);

		setSaving(false);

		if (result.ok) {
			toast.success("Profile saved");
		} else {
			toast.error(result.error ?? "Failed to save profile");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Banner Upload */}
			<div className="space-y-2">
				<span className="text-sm font-medium text-smoke">Banner</span>
				<ImageUpload
					type="banner"
					value={bannerUrl || undefined}
					onChange={(url) => setBannerUrl(url ?? "")}
					ensureAuth={ensureAuth}
				/>
			</div>

			<div className="grid gap-6 sm:grid-cols-2">
				{/* Avatar Upload */}
				<div className="space-y-2">
					<span className="text-sm font-medium text-smoke">Avatar</span>
					<ImageUpload
						type="avatar"
						value={avatarUrl || undefined}
						onChange={(url) => setAvatarUrl(url ?? "")}
						ensureAuth={ensureAuth}
					/>
				</div>

				{/* Display Name */}
				<div className="space-y-2">
					<label htmlFor="displayName" className="text-sm font-medium text-smoke">
						Display Name
					</label>
					<Input
						id="displayName"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						maxLength={60}
						placeholder="Your name or alias"
						className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
					/>
					<p className="text-xs text-smoke-dark">{displayName.length}/60</p>
				</div>
			</div>

			{/* Bio */}
			<div className="space-y-2">
				<label htmlFor="bio" className="text-sm font-medium text-smoke">
					Bio
				</label>
				<textarea
					id="bio"
					value={bio}
					onChange={(e) => setBio(e.target.value)}
					maxLength={MAX_BIO}
					rows={3}
					placeholder="Tell the community about yourself..."
					className={cn(
						"w-full rounded-md border border-anvil-gray-light bg-obsidian-black/50 px-3 py-2 text-sm text-steel-white placeholder:text-smoke-dark",
						"focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
					)}
				/>
				<p className="text-xs text-smoke-dark">
					{bio.length}/{MAX_BIO}
				</p>
			</div>

			{/* Social Links */}
			<div className="grid gap-6 sm:grid-cols-3">
				<div className="space-y-2">
					<label htmlFor="website" className="text-sm font-medium text-smoke">
						<GlobeIcon className="mr-1 inline size-3.5" />
						Website
					</label>
					<Input
						id="website"
						value={website}
						onChange={(e) => setWebsite(e.target.value)}
						placeholder="https://yoursite.com"
						className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="twitter" className="text-sm font-medium text-smoke">
						<XIcon className="mr-1 inline size-3.5" />
						Twitter / X
					</label>
					<Input
						id="twitter"
						value={twitterHandle}
						onChange={(e) => setTwitterHandle(e.target.value)}
						placeholder="username (no @)"
						className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="telegram" className="text-sm font-medium text-smoke">
						Telegram
					</label>
					<Input
						id="telegram"
						value={telegramHandle}
						onChange={(e) => setTelegramHandle(e.target.value)}
						placeholder="username (no @)"
						className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
					/>
				</div>
			</div>

			{/* Preview */}
			{(displayName || avatarUrl) && (
				<div className="rounded-lg border border-anvil-gray-light bg-obsidian-black/50 p-4">
					<p className="mb-3 text-xs font-medium text-smoke-dark">Preview</p>
					<div className="flex items-center gap-3">
						{avatarUrl ? (
							// biome-ignore lint/performance/noImgElement: preview of user-uploaded/external avatar URL
							<img
								src={avatarUrl}
								alt="Avatar preview"
								className="size-12 rounded-full object-cover"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
								}}
							/>
						) : (
							<ImageFallback name={displayName || address} size={48} variant="circle" />
						)}
						<div>
							<p className="font-semibold text-steel-white">
								{displayName || `${address.slice(0, 8)}...${address.slice(-6)}`}
							</p>
							{bio && <p className="mt-0.5 text-xs text-smoke-dark line-clamp-2">{bio}</p>}
						</div>
					</div>
				</div>
			)}

			<Button
				type="submit"
				disabled={saving}
				className="bg-primary text-primary-foreground hover:bg-primary/90"
			>
				{saving ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : (
					<SaveIcon className="mr-2 size-4" />
				)}
				{existing ? "Update Profile" : "Claim Profile"}
			</Button>
		</form>
	);
}
