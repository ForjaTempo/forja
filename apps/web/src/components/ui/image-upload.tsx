"use client";

import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
	type: "token" | "launch" | "avatar" | "banner";
	value?: string;
	onChange: (url: string | null) => void;
	className?: string;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

const VARIANT_STYLES: Record<
	ImageUploadProps["type"],
	{ previewClass: string; dropzoneClass: string; label: string }
> = {
	token: {
		previewClass: "size-32 rounded-lg",
		dropzoneClass: "size-32 rounded-lg",
		label: "Token Logo",
	},
	launch: {
		previewClass: "size-32 rounded-lg",
		dropzoneClass: "size-32 rounded-lg",
		label: "Launch Image",
	},
	avatar: {
		previewClass: "size-24 rounded-full",
		dropzoneClass: "size-24 rounded-full",
		label: "Avatar",
	},
	banner: {
		previewClass: "h-[100px] w-full rounded-lg",
		dropzoneClass: "h-[100px] w-full rounded-lg",
		label: "Banner",
	},
};

export function ImageUpload({ type, value, onChange, className }: ImageUploadProps) {
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const variant = VARIANT_STYLES[type];

	const handleFile = useCallback(
		async (file: File) => {
			setError(null);

			// Client-side validation
			if (file.size > MAX_SIZE) {
				setError("File too large (max 5MB)");
				return;
			}

			const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
			if (!validTypes.includes(file.type)) {
				setError("Invalid format. Use PNG, JPEG, WebP, or GIF");
				return;
			}

			// Show preview immediately
			const previewUrl = URL.createObjectURL(file);
			setPreview(previewUrl);
			setUploading(true);
			setProgress(0);

			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("type", type);

				// Use XMLHttpRequest for upload progress
				const url = await new Promise<string>((resolve, reject) => {
					const xhr = new XMLHttpRequest();

					xhr.upload.addEventListener("progress", (e) => {
						if (e.lengthComputable) {
							setProgress(Math.round((e.loaded / e.total) * 100));
						}
					});

					xhr.addEventListener("load", () => {
						if (xhr.status >= 200 && xhr.status < 300) {
							try {
								const data = JSON.parse(xhr.responseText);
								if (data.ok) {
									resolve(data.url);
								} else {
									reject(new Error(data.error || "Upload failed"));
								}
							} catch {
								reject(new Error("Invalid response"));
							}
						} else if (xhr.status === 401) {
							reject(new Error("Please connect your wallet first"));
						} else if (xhr.status === 429) {
							reject(new Error("Upload rate limit exceeded"));
						} else {
							reject(new Error("Upload failed"));
						}
					});

					xhr.addEventListener("error", () => reject(new Error("Network error")));
					xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

					xhr.open("POST", "/api/upload");
					xhr.send(formData);
				});

				onChange(url);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Upload failed");
				setPreview(null);
				onChange(null);
			} finally {
				setUploading(false);
				setProgress(0);
			}
		},
		[type, onChange],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragOver(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
			// Reset input so same file can be re-selected
			e.target.value = "";
		},
		[handleFile],
	);

	const handleRemove = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (preview) URL.revokeObjectURL(preview);
			setPreview(null);
			setError(null);
			onChange(null);
		},
		[preview, onChange],
	);

	const displayUrl = value || preview;

	return (
		<div className={cn("space-y-2", className)}>
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPT}
				onChange={handleInputChange}
				className="hidden"
			/>

			{displayUrl ? (
				// Preview state
				<div className="relative inline-block">
					{/* biome-ignore lint/performance/noImgElement: dynamic blob/upload preview URLs, not suitable for next/image */}
					<img
						src={displayUrl}
						alt={variant.label}
						className={cn(variant.previewClass, "object-cover border border-border-standard")}
					/>
					{!uploading && (
						<button
							type="button"
							onClick={handleRemove}
							className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-surface-elevated border border-border-standard text-smoke hover:text-steel-white hover:bg-ember-red transition-colors"
						>
							<XIcon className="size-3.5" />
						</button>
					)}
					{uploading && (
						<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
							<div className="flex flex-col items-center gap-1">
								<Loader2Icon className="size-5 animate-spin text-indigo" />
								<span className="text-xs text-white">{progress}%</span>
							</div>
						</div>
					)}
				</div>
			) : (
				// Dropzone state
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					onDrop={handleDrop}
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					className={cn(
						variant.dropzoneClass,
						"flex flex-col items-center justify-center gap-1.5 border-2 border-dashed transition-colors cursor-pointer",
						dragOver
							? "border-indigo bg-indigo/10"
							: "border-border-standard bg-surface-field hover:border-indigo/50",
					)}
				>
					{type === "banner" ? (
						<ImageIcon className="size-6 text-smoke-dark" />
					) : (
						<UploadIcon className="size-5 text-smoke-dark" />
					)}
					<span className="text-xs text-smoke-dark">
						{type === "banner" ? "Upload banner" : "Upload"}
					</span>
				</button>
			)}

			{error && <p className="text-xs text-ember-red">{error}</p>}
		</div>
	);
}
