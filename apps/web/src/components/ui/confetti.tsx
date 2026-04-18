"use client";

import confetti from "canvas-confetti";

const CONFETTI_COLORS = ["#818cf8", "#ffffff", "#c0c0c0", "#a5b4fc"];

export function triggerConfetti() {
	const end = Date.now() + 600;

	const frame = () => {
		confetti({
			particleCount: 3,
			angle: 60,
			spread: 55,
			origin: { x: 0, y: 0.7 },
			colors: CONFETTI_COLORS,
			disableForReducedMotion: true,
		});
		confetti({
			particleCount: 3,
			angle: 120,
			spread: 55,
			origin: { x: 1, y: 0.7 },
			colors: CONFETTI_COLORS,
			disableForReducedMotion: true,
		});

		if (Date.now() < end) {
			requestAnimationFrame(frame);
		}
	};

	frame();
}
