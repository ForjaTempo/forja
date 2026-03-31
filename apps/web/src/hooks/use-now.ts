"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current unix timestamp as bigint, updated every 15 seconds.
 * Used for live vesting progress calculations.
 */
export function useNow(): bigint {
	const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

	useEffect(() => {
		const interval = setInterval(() => {
			setNow(BigInt(Math.floor(Date.now() / 1000)));
		}, 15_000);
		return () => clearInterval(interval);
	}, []);

	return now;
}
