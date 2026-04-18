"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ForjaLogo } from "@/components/shared/forja-logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { hasSwap } from "@/lib/constants";
import { hasClaimer, hasLaunchpad } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const toolNavLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/multisend", label: "Multisend" },
	{ href: "/lock", label: "Lock" },
	...(hasClaimer ? [{ href: "/claim/create", label: "Claim" }] : []),
	...(hasLaunchpad ? [{ href: "/launch", label: "Launchpad" }] : []),
	...(hasSwap ? [{ href: "/swap", label: "Swap" }] : []),
	{ href: "/tokens", label: "Tokens" },
];

const personalNavLinks = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/profile", label: "Profile" },
];

function isActive(pathname: string, href: string): boolean {
	if (href === "/claim/create") return pathname.startsWith("/claim");
	if (href === "/launch") return pathname.startsWith("/launch");
	if (href === "/tokens") return pathname.startsWith("/tokens");
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const { isConnected } = useAccount();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<button
					type="button"
					aria-label="Menu"
					className="inline-flex size-9 items-center justify-center rounded-lg border border-border-hair bg-bg-field text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary md:hidden"
				>
					<MenuIcon className="size-5" />
				</button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 border-border-subtle bg-bg-elevated">
				<SheetHeader>
					<SheetTitle asChild>
						<Link
							href="/"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2"
						>
							<ForjaLogo size={22} />
							<span className="font-display text-[20px] tracking-[-0.01em] text-text-primary">
								Forja
							</span>
						</Link>
					</SheetTitle>
				</SheetHeader>

				<nav className="mt-8 flex flex-col gap-0.5 px-1">
					<div className="px-3 pb-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
						Tools
					</div>
					{toolNavLinks.map((link) => {
						const active = isActive(pathname, link.href);
						return (
							<Link
								key={link.href}
								href={link.href}
								onClick={() => setOpen(false)}
								className={cn(
									"relative rounded-lg px-3 py-2.5 font-medium text-[14px] transition-colors",
									active
										? "bg-bg-field text-text-primary"
										: "text-text-secondary hover:bg-bg-field/60 hover:text-text-primary",
								)}
							>
								{link.label}
								{active && (
									<span
										aria-hidden
										className="absolute top-1/2 right-3 size-1 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold-glow)]"
									/>
								)}
							</Link>
						);
					})}

					{isConnected && (
						<>
							<div className="mt-5 px-3 pb-2 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
								You
							</div>
							{personalNavLinks.map((link) => {
								const active = isActive(pathname, link.href);
								return (
									<Link
										key={link.href}
										href={link.href}
										onClick={() => setOpen(false)}
										className={cn(
											"relative rounded-lg px-3 py-2.5 font-medium text-[14px] transition-colors",
											active
												? "bg-bg-field text-text-primary"
												: "text-text-secondary hover:bg-bg-field/60 hover:text-text-primary",
										)}
									>
										{link.label}
										{active && (
											<span
												aria-hidden
												className="absolute top-1/2 right-3 size-1 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold-glow)]"
											/>
										)}
									</Link>
								);
							})}
						</>
					)}
				</nav>
			</SheetContent>
		</Sheet>
	);
}
