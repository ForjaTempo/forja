"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import { ConnectButton } from "./connect-button";
import { MobileNav } from "./mobile-nav";

const baseNavLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/multisend", label: "Multisend" },
	{ href: "/lock", label: "Lock" },
	{ href: "/tokens", label: "Tokens" },
];

export function Header() {
	const pathname = usePathname();
	const { isConnected } = useAccount();

	const navLinks = isConnected
		? [...baseNavLinks, { href: "/dashboard", label: "Dashboard" }]
		: baseNavLinks;

	return (
		<header className="sticky top-0 z-50 border-b border-anvil-gray-light bg-forge-black/80 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-8">
					<MobileNav />
					<Link href="/" className="text-xl font-bold tracking-tight text-molten-amber">
						FORJA
					</Link>
					<nav className="hidden items-center gap-1 md:flex">
						{navLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									"rounded-md px-3 py-2 text-sm font-medium transition-colors",
									pathname === link.href || (link.href === "/dashboard" && pathname.startsWith("/dashboard"))
										? "bg-anvil-gray-light text-molten-amber"
										: "text-smoke hover:text-steel-white",
								)}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<ConnectButton />
			</div>
		</header>
	);
}
