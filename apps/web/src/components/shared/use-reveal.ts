"use client";

import { useEffect } from "react";

/**
 * Scroll-triggered reveal animation for `.reveal` elements.
 *
 * DESIGN CHOICE — default visible, hide via JS:
 * Elements marked `.reveal` are VISIBLE by default in CSS. On mount this hook
 * walks every `.reveal` and adds `.pending` to any that are currently below
 * the fold. Pending elements fade/slide/blur in as they enter the viewport.
 *
 * This inversion is critical: if CSS defaulted to `opacity: 0`, the page
 * would flash blank on cold load (JS hasn't hydrated yet — no `.in` class
 * to add). With default visible, above-fold content paints immediately and
 * we only spend the animation budget on content that actually scrolls in.
 */
export function useReveal() {
	useEffect(() => {
		const BELOW_FOLD_MARGIN = 120; // px below viewport we treat as pending
		const els = document.querySelectorAll<HTMLElement>(".reveal");

		// First pass: flag everything below the fold as pending.
		for (const el of Array.from(els)) {
			const rect = el.getBoundingClientRect();
			if (rect.top > window.innerHeight - BELOW_FOLD_MARGIN) {
				el.classList.add("pending");
			}
		}

		// Observer reveals pending elements as they scroll into view.
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						entry.target.classList.remove("pending");
						io.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
		);

		for (const el of Array.from(els)) {
			if (el.classList.contains("pending")) io.observe(el);
		}

		// Scroll fallback in case IntersectionObserver misses an element (e.g.
		// inside a transformed/filtered ancestor). Keeps reveal robust.
		const onScroll = () => {
			for (const el of Array.from(document.querySelectorAll<HTMLElement>(".reveal.pending"))) {
				const rect = el.getBoundingClientRect();
				if (rect.top < window.innerHeight - 40) el.classList.remove("pending");
			}
		};
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			io.disconnect();
			window.removeEventListener("scroll", onScroll);
		};
	}, []);
}
