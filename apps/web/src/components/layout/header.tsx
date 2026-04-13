"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { hasClaimer, hasLaunchpad } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { ConnectButton } from "./connect-button";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";

const baseNavLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/multisend", label: "Multisend" },
	{ href: "/lock", label: "Lock" },
	...(hasClaimer ? [{ href: "/claim/create", label: "Claim" }] : []),
	...(hasLaunchpad ? [{ href: "/launch", label: "Launch" }] : []),
	{ href: "/tokens", label: "Tokens" },
];

export function Header() {
	const pathname = usePathname();
	const { isConnected } = useAccount();

	const navLinks = isConnected
		? [
				...baseNavLinks,
				{ href: "/dashboard", label: "Dashboard" },
				{ href: "/profile", label: "Profile" },
			]
		: baseNavLinks;

	return (
		<header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-page/80 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-8">
					<MobileNav />
					<Link href="/" className="text-xl font-bold tracking-tight text-steel-white">
						FORJA
					</Link>
					<nav className="hidden items-center gap-1 md:flex">
						{navLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									"rounded-md px-3 py-2 text-sm font-medium transition-colors",
									pathname === link.href ||
										(link.href === "/dashboard" && pathname.startsWith("/dashboard")) ||
										(link.href === "/profile" && pathname.startsWith("/profile")) ||
										(link.href === "/claim/create" && pathname.startsWith("/claim")) ||
										(link.href === "/launch" && pathname.startsWith("/launch")) ||
										(link.href === "/tokens" && pathname.startsWith("/tokens"))
										? "bg-surface-field text-indigo"
										: "text-smoke hover:text-steel-white",
								)}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<NotificationBell />
					<ConnectButton />
				</div>
			</div>
		</header>
	);
}
