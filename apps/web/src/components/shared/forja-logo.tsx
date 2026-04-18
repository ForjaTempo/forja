interface ForjaLogoProps {
	size?: number;
	className?: string;
}

/**
 * Forja mark — a geometric anvil silhouette in molten gold with an ember
 * spark on the horn. The anvil reads as both a forge tool and an abstract
 * "F" shape; the ember signals hot-work + the brand's fire accent.
 */
export function ForjaLogo({ size = 28, className }: ForjaLogoProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 32"
			fill="none"
			className={className}
			style={{ display: "block" }}
			aria-label="Forja"
		>
			<defs>
				<linearGradient id="forjaGold" x1="0" x2="1" y1="0" y2="1">
					<stop offset="0" stopColor="#ffe5a8" />
					<stop offset="0.5" stopColor="#f0d38a" />
					<stop offset="1" stopColor="#e8b860" />
				</linearGradient>
			</defs>
			<path
				d="M4 10 L28 10 L26 14 L22 14 L22 20 L25 23 L25 26 L7 26 L7 23 L10 20 L10 14 L6 14 Z"
				fill="url(#forjaGold)"
			/>
			<rect x="14" y="6" width="4" height="4" rx="0.5" fill="#ff6b3d" opacity="0.9" />
		</svg>
	);
}
