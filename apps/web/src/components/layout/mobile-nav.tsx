"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { hasClaimer } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const baseNavLinks = [
	{ href: "/create", label: "Create" },
	{ href: "/multisend", label: "Multisend" },
	{ href: "/lock", label: "Lock" },
	...(hasClaimer ? [{ href: "/claim/create", label: "Claim" }] : []),
	{ href: "/tokens", label: "Tokens" },
];

export function MobileNav() {
	const [open, setOpen] = useState(false);
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
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="md:hidden">
					<MenuIcon className="size-5" />
					<span className="sr-only">Menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 bg-anvil-gray border-anvil-gray-light">
				<SheetHeader>
					<SheetTitle>
						<Link
							href="/"
							onClick={() => setOpen(false)}
							className="text-xl font-bold text-molten-amber"
						>
							FORJA
						</Link>
					</SheetTitle>
				</SheetHeader>
				<nav className="mt-6 flex flex-col gap-1 px-2">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className={cn(
								"rounded-md px-3 py-2 text-sm font-medium transition-colors",
								pathname === link.href
									? "bg-anvil-gray-light text-molten-amber"
									: "text-smoke hover:bg-anvil-gray-light hover:text-steel-white",
							)}
						>
							{link.label}
						</Link>
					))}
				</nav>
			</SheetContent>
		</Sheet>
	);
}
