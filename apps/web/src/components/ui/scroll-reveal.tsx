"use client";

import { motion, type Variants } from "framer-motion";
import type * as React from "react";
import { fadeInUp } from "@/lib/motion";

interface ScrollRevealProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	variants?: Variants;
}

function ScrollReveal({ children, className, delay = 0, variants = fadeInUp }: ScrollRevealProps) {
	// If a delay is supplied, merge it into the variants so we don't clobber the
	// existing duration/ease declared on the variant's transition.
	const mergedVariants: Variants = delay
		? {
				...variants,
				visible: {
					...(variants.visible as object),
					transition: {
						...((variants.visible as { transition?: object })?.transition ?? {}),
						delay,
					},
				},
			}
		: variants;

	return (
		<motion.div
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-50px" }}
			variants={mergedVariants}
			className={className}
		>
			{children}
		</motion.div>
	);
}

export { ScrollReveal, type ScrollRevealProps };
