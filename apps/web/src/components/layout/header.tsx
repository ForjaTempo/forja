"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@/components/layout/connect-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ForjaLogo } from "@/components/shared/forja-logo";
import { hasSwap } from "@/lib/constants";
import { hasClaimer, hasLaunchpad } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const baseNavLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/multisend", label: "Multisend" },
	{ href: "/lock", label: "Lock" },
	...(hasClaimer ? [{ href: "/claim/create", label: "Claim" }] : []),
	...(hasLaunchpad ? [{ href: "/launch", label: "Launchpad" }] : []),
	...(hasSwap ? [{ href: "/swap", label: "Swap" }] : []),
	{ href: "/tokens", label: "Tokens" },
];

function isActive(pathname: string, href: string): boolean {
	if (href === "/") return pathname === "/";
	if (href === "/claim/create") return pathname.startsWith("/claim");
	if (href === "/launch") return pathname.startsWith("/launch");
	if (href === "/tokens") return pathname.startsWith("/tokens");
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
	const pathname = usePathname();
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 10);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={cn(
				"fixed inset-x-0 top-0 z-50 transition-all duration-300",
				scrolled
					? "border-b border-border-hair bg-bg-page/75 backdrop-blur-xl backdrop-saturate-150"
					: "border-b border-transparent bg-transparent",
			)}
		>
			<div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-6 px-6 lg:px-10">
				<div className="flex items-center gap-3">
					<MobileNav />
					<Link href="/" className="flex items-center gap-2.5">
						<ForjaLogo size={26} />
						<span className="font-display text-[22px] leading-none tracking-[-0.01em] text-text-primary">
							Forja
						</span>
						<span className="ml-1 rounded border border-border-gold px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
							Tempo
						</span>
					</Link>
				</div>

				<nav className="hidden items-center gap-1 md:flex">
					{baseNavLinks.map((link) => {
						const active = isActive(pathname, link.href);
						return (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									"relative px-3.5 py-2 text-[13.5px] font-medium transition-colors",
									active ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
								)}
							>
								{link.label}
								{active && (
									<span
										aria-hidden
										className="-translate-x-1/2 absolute bottom-0 left-1/2 h-1 w-1 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold-glow)]"
									/>
								)}
							</Link>
						);
					})}
				</nav>

				<div className="flex items-center gap-2">
					<div className="hidden items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 font-mono text-[12px] text-text-secondary lg:flex">
						<span
							aria-hidden
							className="size-1.5 animate-[ember-flicker_2s_ease-in-out_infinite] rounded-full bg-green shadow-[0_0_6px_var(--color-green)]"
						/>
						Tempo Mainnet
					</div>
					<NotificationBell />
					<ConnectButton />
				</div>
			</div>
		</header>
	);
}
