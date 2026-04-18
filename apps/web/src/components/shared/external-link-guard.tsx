"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

// Hosts we consider trusted enough to skip the warning modal.
// Matches exact hostname OR any subdomain (*.host).
const ALLOWED_HOSTS = [
	"x.com",
	"twitter.com",
	"t.me",
	"telegram.me",
	"telegram.org",
	"discord.com",
	"discord.gg",
	"github.com",
	"explore.tempo.xyz",
	"explore.moderato.tempo.xyz",
	"tempo.xyz",
	"docs.tempo.xyz",
	"uniswap.org",
	"app.uniswap.org",
];

const FORJA_ORIGINS = ["https://forja.fun", "http://forja.fun"];

function isInternalHref(href: string): boolean {
	if (!href) return true;
	if (href.startsWith("/") && !href.startsWith("//")) return true;
	for (const origin of FORJA_ORIGINS) {
		if (href === origin || href.startsWith(`${origin}/`)) return true;
	}
	return false;
}

function isAllowedHost(href: string): boolean {
	try {
		const url = new URL(href);
		const host = url.hostname.toLowerCase();
		for (const allowed of ALLOWED_HOSTS) {
			if (host === allowed || host.endsWith(`.${allowed}`)) return true;
		}
		return false;
	} catch {
		return false;
	}
}

interface ExternalLinkGuardProps {
	href: string;
	children: React.ReactNode;
	className?: string;
}

export function ExternalLinkGuard({ href, children, className }: ExternalLinkGuardProps) {
	const [open, setOpen] = useState(false);

	// Internal / safe-host links — render a plain anchor.
	if (isInternalHref(href) || isAllowedHost(href)) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" className={className}>
				{children}
			</a>
		);
	}

	const handleContinue = () => {
		window.open(href, "_blank", "noopener,noreferrer");
		setOpen(false);
	};

	return (
		<>
			<button type="button" onClick={() => setOpen(true)} className={className}>
				{children}
			</button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Leaving FORJA</DialogTitle>
						<DialogDescription>
							You're about to visit an external site that FORJA doesn't control. Only proceed if you
							trust the source.
						</DialogDescription>
					</DialogHeader>
					<div className="rounded-md border border-anvil-gray-light bg-obsidian-black/50 p-3">
						<code className="break-all font-mono text-xs text-smoke">{href}</code>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleContinue} className="bg-indigo text-white hover:bg-indigo/90">
							Continue to site <ExternalLinkIcon className="ml-1 size-3.5" />
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
