"use client";

import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TokenSearchProps {
	value: string;
	onChange: (value: string) => void;
}

export function TokenSearch({ value, onChange }: TokenSearchProps) {
	const [local, setLocal] = useState(value);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		setLocal(value);
	}, [value]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const v = e.target.value;
			setLocal(v);
			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => onChange(v), 300);
		},
		[onChange],
	);

	useEffect(() => {
		return () => clearTimeout(timerRef.current);
	}, []);

	return (
		<div className="relative">
			<SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-text-tertiary" />
			<input
				type="text"
				placeholder="Search by name, symbol, or address…"
				value={local}
				onChange={handleChange}
				className="w-full rounded-xl border border-border-hair bg-bg-field py-3 pr-4 pl-10 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
			/>
		</div>
	);
}
