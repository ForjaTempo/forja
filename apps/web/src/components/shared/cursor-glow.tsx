"use client";

import { useEffect, useRef } from "react";

interface CursorGlowProps {
	color?: string;
	size?: number;
}

/**
 * Soft radial glow that follows the cursor with spring lag. Subtle premium
 * touch — used on marketing/landing surfaces, not on form-heavy pages.
 */
export function CursorGlow({ color = "rgba(240,211,138,0.08)", size = 500 }: CursorGlowProps) {
	const ref = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		let raf = 0;
		let tx = 0;
		let ty = 0;
		let cx = 0;
		let cy = 0;
		const move = (e: MouseEvent) => {
			tx = e.clientX;
			ty = e.clientY;
		};
		const loop = () => {
			cx += (tx - cx) * 0.08;
			cy += (ty - cy) * 0.08;
			if (ref.current) {
				ref.current.style.transform = `translate(${cx - size / 2}px, ${cy - size / 2}px)`;
			}
			raf = requestAnimationFrame(loop);
		};
		window.addEventListener("mousemove", move);
		raf = requestAnimationFrame(loop);
		return () => {
			window.removeEventListener("mousemove", move);
			cancelAnimationFrame(raf);
		};
	}, [size]);

	return (
		<div
			ref={ref}
			aria-hidden
			style={{
				position: "fixed",
				pointerEvents: "none",
				zIndex: 2,
				width: size,
				height: size,
				background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
				filter: "blur(20px)",
				top: 0,
				left: 0,
			}}
		/>
	);
}
