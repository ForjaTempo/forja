"use client";

import { useEffect } from "react";

/**
 * Animate `.reveal` elements in as they enter the viewport. Fires once per
 * element — use `.reveal` on any block you want to slide+fade up.
 *
 * Call this hook once at page/layout level. Safe to call multiple times; the
 * observer is per-mount and cleaned up on unmount.
 */
export function useReveal() {
	useEffect(() => {
		const els = document.querySelectorAll<HTMLElement>(".reveal");

		// Immediately reveal anything in or near the viewport on mount.
		for (const el of Array.from(els)) {
			const rect = el.getBoundingClientRect();
			if (rect.top < window.innerHeight + 100) el.classList.add("in");
		}

		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						entry.target.classList.add("in");
						io.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0.08 },
		);
		for (const el of Array.from(els)) {
			if (!el.classList.contains("in")) io.observe(el);
		}

		// Scroll fallback in case the IO misses something (e.g. transforms).
		const onScroll = () => {
			for (const el of Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"))) {
				const rect = el.getBoundingClientRect();
				if (rect.top < window.innerHeight - 40) el.classList.add("in");
			}
		};
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			io.disconnect();
			window.removeEventListener("scroll", onScroll);
		};
	}, []);
}
