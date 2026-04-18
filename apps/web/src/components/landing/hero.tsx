"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useReveal } from "@/components/shared/use-reveal";

/** Rising sparks canvas — a few dozen warm particles fading up. */
function SparkField() {
	const ref = useRef<HTMLCanvasElement | null>(null);
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		let w = canvas.offsetWidth;
		let h = canvas.offsetHeight;
		const resize = () => {
			w = canvas.offsetWidth;
			h = canvas.offsetHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();

		type Spark = {
			x: number;
			y: number;
			vx: number;
			vy: number;
			r: number;
			life: number;
			maxLife: number;
			hue: number;
		};

		const sparks: Spark[] = Array.from({ length: 60 }).map(() => ({
			x: Math.random() * w,
			y: h + Math.random() * 100,
			vx: (Math.random() - 0.5) * 0.3,
			vy: -Math.random() * 1.2 - 0.3,
			r: Math.random() * 1.8 + 0.4,
			life: Math.random(),
			maxLife: Math.random() * 3 + 2,
			hue: Math.random() > 0.5 ? 40 : 25,
		}));

		let raf = 0;
		const tick = () => {
			ctx.clearRect(0, 0, w, h);
			for (const s of sparks) {
				s.x += s.vx;
				s.y += s.vy;
				s.life += 0.016;
				if (s.y < -20 || s.life > s.maxLife) {
					s.x = Math.random() * w;
					s.y = h + 20;
					s.life = 0;
					s.vy = -Math.random() * 1.2 - 0.3;
				}
				const alpha = Math.max(0, 1 - s.life / s.maxLife);
				const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
				grad.addColorStop(0, `hsla(${s.hue}, 95%, 70%, ${alpha * 0.9})`);
				grad.addColorStop(1, `hsla(${s.hue}, 95%, 50%, 0)`);
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `hsla(${s.hue + 10}, 100%, 85%, ${alpha})`;
				ctx.beginPath();
				ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
				ctx.fill();
			}
			raf = requestAnimationFrame(tick);
		};
		tick();

		window.addEventListener("resize", resize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
		};
	}, []);
	return <canvas ref={ref} className="block h-full w-full" aria-hidden />;
}

interface HeroProps {
	tokensCount?: number;
	launchesCount?: number;
	creatorsCount?: number;
}

export function Hero({ tokensCount, launchesCount, creatorsCount }: HeroProps = {}) {
	useReveal();

	const strip: Array<{ label: string; value: string; accent: string }> = [
		{
			label: "Tokens forged",
			value: tokensCount != null ? tokensCount.toLocaleString() : "—",
			accent: "var(--color-gold)",
		},
		{
			label: "Launches",
			value: launchesCount != null ? launchesCount.toLocaleString() : "—",
			accent: "var(--color-indigo)",
		},
		{
			label: "Active creators",
			value: creatorsCount != null ? creatorsCount.toLocaleString() : "—",
			accent: "var(--color-green)",
		},
		{ label: "Sub-second", value: "340ms", accent: "var(--color-ember)" },
	];

	return (
		<section className="relative min-h-[92vh] overflow-hidden pt-20">
			<div className="absolute inset-0 z-0">
				<div
					aria-hidden
					className="-translate-x-1/2 -translate-y-1/2 absolute top-[55%] left-1/2 size-[900px] blur-3xl"
					style={{
						background:
							"radial-gradient(circle, rgba(240,211,138,0.15) 0%, rgba(255,107,61,0.08) 30%, transparent 60%)",
					}}
				/>
				<div
					aria-hidden
					className="absolute inset-0"
					style={{
						backgroundImage:
							"linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
						backgroundSize: "60px 60px",
						maskImage: "radial-gradient(ellipse at center, black 10%, transparent 70%)",
						WebkitMaskImage: "radial-gradient(ellipse at center, black 10%, transparent 70%)",
					}}
				/>
				<div className="absolute inset-0 h-full">
					<SparkField />
				</div>
			</div>

			<div className="relative z-[3] mx-auto max-w-[1400px] px-6 pt-16 pb-12 text-center lg:px-10">
				<div className="reveal mb-8">
					<span
						className="inline-flex items-center gap-2.5 rounded-full border border-border-gold bg-[rgba(240,211,138,0.06)] py-1.5 pr-3.5 pl-2 text-[12.5px] text-text-secondary"
						style={{
							boxShadow: "0 0 24px -8px rgba(240,211,138,0.35)",
							animation: "pulse-glow 3.5s ease-in-out infinite",
						}}
					>
						<span className="rounded-sm bg-gold px-1.5 py-0.5 font-mono font-semibold text-[#1a1307] text-[10px] tracking-[0.1em]">
							NEW
						</span>
						Launchpad is live · Trade bonding-curve tokens on Tempo
					</span>
				</div>

				<h1
					className="reveal mx-auto mb-7 font-display font-normal text-[clamp(44px,7.5vw,108px)] leading-[0.98] tracking-[-0.04em]"
					style={{ transitionDelay: "0.05s" }}
				>
					<span className="block">Forge tokens at</span>
					<span className="gold-text block italic">the speed of payments.</span>
				</h1>

				<p
					className="reveal mx-auto mb-12 max-w-[640px] text-[19px] text-text-secondary leading-[1.55]"
					style={{ transitionDelay: "0.15s" }}
				>
					The complete token toolkit for Tempo — the payments-first blockchain by Stripe and
					Paradigm. Create TIP-20s, distribute to thousands, lock liquidity, run airdrops and launch
					with bonding curves.
				</p>

				<div
					className="reveal mb-16 flex justify-center gap-3.5"
					style={{ transitionDelay: "0.3s" }}
				>
					<Link
						href="/create"
						className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 font-semibold text-[#1a1307] text-[15px] transition-transform hover:-translate-y-0.5"
						style={{
							background: "linear-gradient(135deg, #ffe5a8, #f0d38a 50%, #e8b860)",
							boxShadow: "0 4px 30px rgba(240,211,138,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
						}}
					>
						Start forging →
					</Link>
					<Link
						href="/launch"
						className="inline-flex items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-elevated px-6 py-3.5 font-medium text-[15px] text-text-primary transition-colors hover:border-border-strong"
					>
						Explore launchpad
					</Link>
				</div>

				<div
					className="reveal inline-flex items-center rounded-2xl border border-border-hair bg-[rgba(18,18,26,0.5)] px-1 py-4 backdrop-blur-md"
					style={{ transitionDelay: "0.45s" }}
				>
					{strip.map((s, i) => (
						<div key={s.label} className="flex items-center">
							<div className="px-7 text-left">
								<div className="mb-1 font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
									{s.label}
								</div>
								<div
									className="font-display text-[24px] tracking-[-0.02em]"
									style={{ color: s.accent }}
								>
									{s.value}
								</div>
							</div>
							{i < strip.length - 1 && <div className="h-8 w-px bg-border-hair" />}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
