"use client";

import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

type CounterFormat = "number" | "compact" | "currency" | "percent";

interface AnimatedCounterProps {
	value: number;
	format?: CounterFormat;
	duration?: number;
	className?: string;
}

function formatValue(value: number, format: CounterFormat): string {
	switch (format) {
		case "currency":
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(value);
		case "compact":
			return new Intl.NumberFormat("en-US", {
				notation: "compact",
				maximumFractionDigits: 1,
			}).format(value);
		case "percent":
			return `${value.toFixed(1)}%`;
		default:
			return new Intl.NumberFormat("en-US").format(Math.round(value));
	}
}

function AnimatedCounter({
	value,
	format = "number",
	duration = 1.5,
	className,
}: AnimatedCounterProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const motionValue = useMotionValue(0);
	const springValue = useSpring(motionValue, {
		duration: duration * 1000,
		bounce: 0,
	});
	const isInView = useInView(ref, { once: true, margin: "-50px" });

	useEffect(() => {
		if (isInView) {
			motionValue.set(value);
		}
	}, [isInView, value, motionValue]);

	useEffect(() => {
		const unsubscribe = springValue.on("change", (latest) => {
			if (ref.current) {
				ref.current.textContent = formatValue(latest, format);
			}
		});
		return unsubscribe;
	}, [springValue, format]);

	return (
		<span ref={ref} className={className}>
			{formatValue(0, format)}
		</span>
	);
}

export { AnimatedCounter, type AnimatedCounterProps };
