"use client";

/**
 * Animated anvil + heated-metal bar SVG used as the hero visual on /create.
 * Ports the forja-design/create.jsx ForgeAnimation primitive to Tailwind
 * (no runtime prop state — this is decorative). The glow bed + spark layer
 * use pure CSS animations so the component stays cheap to render.
 */
export function ForgeAnimation() {
	return (
		<div className="relative mx-auto aspect-square w-full max-w-md">
			{/* Radial ember glow bed */}
			<div
				aria-hidden
				className="absolute inset-[20%] rounded-full blur-3xl"
				style={{
					background: "radial-gradient(circle, var(--color-ember-glow) 0%, transparent 60%)",
					animation: "ember-flicker 2s ease-in-out infinite",
				}}
			/>
			<svg
				viewBox="0 0 400 400"
				className="relative h-full w-full"
				role="img"
				aria-label="Molten token on an anvil"
			>
				<defs>
					<linearGradient id="forge-heat-metal" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#fff8e0" />
						<stop offset="0.3" stopColor="#ffe5a8" />
						<stop offset="0.6" stopColor="#ff9466" />
						<stop offset="1" stopColor="#d94a1f" />
					</linearGradient>
					<linearGradient id="forge-anvil-steel" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#3a3a4a" />
						<stop offset="1" stopColor="#1c1c2a" />
					</linearGradient>
					<filter id="forge-spark-glow">
						<feGaussianBlur stdDeviation="3" />
						<feComponentTransfer>
							<feFuncA type="linear" slope="2" />
						</feComponentTransfer>
					</filter>
				</defs>

				{/* Anvil base */}
				<path
					d="M80 280 L320 280 L300 310 L260 310 L260 360 L320 380 L320 400 L80 400 L80 380 L140 360 L140 310 L100 310 Z"
					fill="url(#forge-anvil-steel)"
					stroke="#4a4a5c"
					strokeWidth="1"
				/>

				{/* Molten token on anvil */}
				<g>
					<circle
						cx="200"
						cy="260"
						r="55"
						fill="url(#forge-heat-metal)"
						filter="url(#forge-spark-glow)"
					/>
					<circle cx="200" cy="260" r="45" fill="url(#forge-heat-metal)" />
					<text
						x="200"
						y="272"
						textAnchor="middle"
						fontFamily="var(--font-display)"
						fontSize="36"
						fill="#1a1307"
						fontWeight="600"
					>
						$
					</text>
				</g>

				{/* Orbiting sparks */}
				{Array.from({ length: 8 }).map((_, i) => {
					const angle = (i / 8) * Math.PI * 2;
					const r = 80;
					const cx = 200 + Math.cos(angle) * r;
					const cy = 260 + Math.sin(angle) * r * 0.4 - 20;
					return (
						<circle
							// biome-ignore lint/suspicious/noArrayIndexKey: decorative sparks, stable order
							key={i}
							cx={cx}
							cy={cy}
							r={1.5}
							fill="#ffe5a8"
							opacity={0.7}
						>
							<animate
								attributeName="opacity"
								values="0;1;0"
								dur={`${1 + i * 0.2}s`}
								repeatCount="indefinite"
							/>
						</circle>
					);
				})}
			</svg>
		</div>
	);
}
