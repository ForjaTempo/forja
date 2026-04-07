"use client";

import { CheckIcon, CopyIcon, SendIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface ShareButtonsProps {
	url: string;
	title: string;
	description?: string;
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [url]);

	const shareText = description ? `${title}\n\n${description}` : title;

	const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
	const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;

	return (
		<div className="flex flex-wrap gap-2">
			<Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
				{copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
				{copied ? "Copied" : "Copy Link"}
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="gap-1.5"
				onClick={() => window.open(twitterUrl, "_blank", "noopener,noreferrer")}
			>
				<XIcon className="size-3.5" />
				Share on X
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="gap-1.5"
				onClick={() => window.open(telegramUrl, "_blank", "noopener,noreferrer")}
			>
				<SendIcon className="size-3.5" />
				Telegram
			</Button>
		</div>
	);
}

function XIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}
