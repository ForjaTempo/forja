"use client";

import type { CreatorProfile } from "@forja/db";
import { GlobeIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { upsertCreatorProfile } from "@/actions/profile";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { ImageUpload } from "@/components/ui/image-upload";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { cn } from "@/lib/utils";

const MAX_DISPLAY_NAME = 60;
const MIN_DISPLAY_NAME = 2;
const MAX_BIO = 280;
const MAX_HANDLE = 64;
const MAX_URL = 200;

const HANDLE_RE = /^[\w.-]+$/;

const labelCls = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary";
const inputCls =
	"w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors";

const goldButtonStyle = {
	background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
	boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
};
const goldButtonCls =
	"inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[#1a1307] text-[15px] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0";

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
			<form
				onSubmit={handleSubmit}
				className="space-y-6 rounded-2xl border border-border-hair bg-bg-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8 lg:col-span-3"
			>
				<div className="space-y-2">
					<span className={labelCls}>Banner</span>
					<ImageUpload
						type="banner"
						value={bannerUrl || undefined}
						onChange={(url) => setBannerUrl(url ?? "")}
						ensureAuth={ensureAuth}
					/>
				</div>

				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-2">
						<span className={labelCls}>Avatar</span>
						<ImageUpload
							type="avatar"
							value={avatarUrl || undefined}
							onChange={(url) => setAvatarUrl(url ?? "")}
							ensureAuth={ensureAuth}
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="displayName" className={labelCls}>
							Display name
						</label>
						<input
							id="displayName"
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							maxLength={MAX_DISPLAY_NAME + 5}
							placeholder="Your name or alias"
							aria-invalid={!!errors.displayName}
							className={inputCls}
							autoComplete="off"
						/>
						<p
							className={cn("text-[11px]", errors.displayName ? "text-red" : "text-text-tertiary")}
						>
							{errors.displayName ?? `${displayName.length} / ${MAX_DISPLAY_NAME}`}
						</p>
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="bio" className={labelCls}>
						Bio
					</label>
					<textarea
						id="bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						maxLength={MAX_BIO + 20}
						rows={3}
						placeholder="Tell the community about yourself…"
						aria-invalid={!!errors.bio}
						className="w-full rounded-xl border border-border-hair bg-bg-field px-4 py-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
					/>
					<p className={cn("text-[11px]", errors.bio ? "text-red" : "text-text-tertiary")}>
						{errors.bio ?? `${bio.length} / ${MAX_BIO}`}
					</p>
				</div>

				<div className="grid gap-6 sm:grid-cols-3">
					<div className="space-y-2">
						<label htmlFor="website" className={cn(labelCls, "flex items-center gap-1")}>
							<GlobeIcon className="size-3" />
							Website
						</label>
						<input
							id="website"
							type="text"
							value={website}
							onChange={(e) => setWebsite(e.target.value)}
							placeholder="https://yoursite.com"
							aria-invalid={!!errors.website}
							className={cn(inputCls, "font-mono text-[13px]")}
							autoComplete="off"
						/>
						{errors.website && <p className="text-[11px] text-red">{errors.website}</p>}
					</div>

					<div className="space-y-2">
						<label htmlFor="twitter" className={cn(labelCls, "flex items-center gap-1")}>
							<XIcon className="size-3" />X · Twitter
						</label>
						<input
							id="twitter"
							type="text"
							value={twitterHandle}
							onChange={(e) => setTwitterHandle(e.target.value)}
							placeholder="username (no @)"
							aria-invalid={!!errors.twitter}
							className={cn(inputCls, "font-mono text-[13px]")}
							autoComplete="off"
						/>
						{errors.twitter && <p className="text-[11px] text-red">{errors.twitter}</p>}
					</div>

					<div className="space-y-2">
						<label htmlFor="telegram" className={labelCls}>
							Telegram
						</label>
						<input
							id="telegram"
							type="text"
							value={telegramHandle}
							onChange={(e) => setTelegramHandle(e.target.value)}
							placeholder="username (no @)"
							aria-invalid={!!errors.telegram}
							className={cn(inputCls, "font-mono text-[13px]")}
							autoComplete="off"
						/>
						{errors.telegram && <p className="text-[11px] text-red">{errors.telegram}</p>}
					</div>
				</div>

				<button
					type="submit"
					disabled={saving || hasErrors}
					className={goldButtonCls}
					style={goldButtonStyle}
				>
					{saving ? (
						<Loader2Icon className="size-4 animate-spin" />
					) : (
						<SaveIcon className="size-4" />
					)}
					{existing ? "Update profile" : "Claim profile"}
				</button>
			</form>

			<aside className="lg:col-span-2">
				<div className="lg:sticky lg:top-24">
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
