"use client";

import type { CreatorProfile } from "@forja/db";
import { GlobeIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { upsertCreatorProfile } from "@/actions/profile";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { cn } from "@/lib/utils";

const MAX_DISPLAY_NAME = 60;
const MIN_DISPLAY_NAME = 2;
const MAX_BIO = 280;
const MAX_HANDLE = 64;
const MAX_URL = 200;

const HANDLE_RE = /^[\w.-]+$/;

interface ProfileFormProps {
	address: string;
	existing: CreatorProfile | null;
}

interface ValidationErrors {
	displayName?: string;
	website?: string;
	twitter?: string;
	telegram?: string;
	bio?: string;
}

function validate(fields: {
	displayName: string;
	bio: string;
	website: string;
	twitterHandle: string;
	telegramHandle: string;
}): ValidationErrors {
	const errors: ValidationErrors = {};

	if (fields.displayName.trim().length > 0 && fields.displayName.trim().length < MIN_DISPLAY_NAME) {
		errors.displayName = `At least ${MIN_DISPLAY_NAME} characters`;
	}
	if (fields.displayName.length > MAX_DISPLAY_NAME) {
		errors.displayName = `Max ${MAX_DISPLAY_NAME} characters`;
	}
	if (fields.bio.length > MAX_BIO) {
		errors.bio = `Max ${MAX_BIO} characters`;
	}

	if (fields.website.trim()) {
		if (fields.website.length > MAX_URL) {
			errors.website = `Max ${MAX_URL} characters`;
		} else {
			const candidate = fields.website.startsWith("http")
				? fields.website
				: `https://${fields.website}`;
			try {
				const u = new URL(candidate);
				if (u.protocol !== "http:" && u.protocol !== "https:") {
					errors.website = "Must be http(s)";
				}
			} catch {
				errors.website = "Invalid URL";
			}
		}
	}

	const tw = fields.twitterHandle.trim().replace(/^@/, "");
	if (tw && (tw.length > MAX_HANDLE || !HANDLE_RE.test(tw))) {
		errors.twitter = "Letters, numbers, dots, dashes, underscores only";
	}

	const tg = fields.telegramHandle.trim().replace(/^@/, "");
	if (tg && (tg.length > MAX_HANDLE || !HANDLE_RE.test(tg))) {
		errors.telegram = "Letters, numbers, dots, dashes, underscores only";
	}

	return errors;
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

	const errors = useMemo(
		() => validate({ displayName, bio, website, twitterHandle, telegramHandle }),
		[displayName, bio, website, twitterHandle, telegramHandle],
	);
	const hasErrors = Object.keys(errors).length > 0;

	// Defer the preview render so keystroke latency stays snappy while the preview
	// catches up when the main thread is idle. Avatar + banner URLs come from
	// ImageUpload which only flips on successful upload (not per-keystroke) — no
	// need to defer those.
	const deferredName = useDeferredValue(displayName);
	const deferredBio = useDeferredValue(bio);
	const deferredWebsite = useDeferredValue(website);
	const deferredTwitter = useDeferredValue(twitterHandle);
	const deferredTelegram = useDeferredValue(telegramHandle);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (hasErrors) return;
		setSaving(true);

		const result = await withAuth(() =>
			upsertCreatorProfile(address, {
				displayName: displayName.trim(),
				bio: bio.trim(),
				avatarUrl,
				bannerUrl,
				website: website.trim(),
				twitterHandle: twitterHandle.trim().replace(/^@/, ""),
				telegramHandle: telegramHandle.trim().replace(/^@/, ""),
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
		<div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
			<form onSubmit={handleSubmit} className="space-y-6 lg:col-span-3">
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
							maxLength={MAX_DISPLAY_NAME + 5}
							placeholder="Your name or alias"
							aria-invalid={!!errors.displayName}
							className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
						/>
						<div className="flex items-center justify-between">
							<p className={cn("text-xs", errors.displayName ? "text-red-400" : "text-smoke-dark")}>
								{errors.displayName ?? `${displayName.length}/${MAX_DISPLAY_NAME}`}
							</p>
						</div>
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
						maxLength={MAX_BIO + 20}
						rows={3}
						placeholder="Tell the community about yourself..."
						aria-invalid={!!errors.bio}
						className={cn(
							"w-full rounded-md border border-anvil-gray-light bg-obsidian-black/50 px-3 py-2 text-sm text-steel-white placeholder:text-smoke-dark",
							"focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
						)}
					/>
					<p className={cn("text-xs", errors.bio ? "text-red-400" : "text-smoke-dark")}>
						{errors.bio ?? `${bio.length}/${MAX_BIO}`}
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
							aria-invalid={!!errors.website}
							className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
						/>
						{errors.website && <p className="text-xs text-red-400">{errors.website}</p>}
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
							aria-invalid={!!errors.twitter}
							className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
						/>
						{errors.twitter && <p className="text-xs text-red-400">{errors.twitter}</p>}
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
							aria-invalid={!!errors.telegram}
							className="border-anvil-gray-light bg-obsidian-black/50 text-steel-white placeholder:text-smoke-dark"
						/>
						{errors.telegram && <p className="text-xs text-red-400">{errors.telegram}</p>}
					</div>
				</div>

				<Button
					type="submit"
					disabled={saving || hasErrors}
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

			{/* Live Preview — sticky on desktop, deferred re-renders for snappy input */}
			<aside className="lg:col-span-2">
				<div className="lg:sticky lg:top-20">
					<ProfilePreview
						address={address}
						displayName={deferredName}
						bio={deferredBio}
						avatarUrl={avatarUrl}
						bannerUrl={bannerUrl}
						website={deferredWebsite}
						twitterHandle={deferredTwitter.replace(/^@/, "")}
						telegramHandle={deferredTelegram.replace(/^@/, "")}
					/>
				</div>
			</aside>
		</div>
	);
}
