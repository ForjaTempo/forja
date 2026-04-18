"use client";

import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface LaunchSearchProps {
	value: string;
	onChange: (value: string) => void;
}

export function LaunchSearch({ value, onChange }: LaunchSearchProps) {
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
			<SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3.5 size-4 text-text-tertiary" />
			<Input
				type="text"
				placeholder="Search tokens, creators, addresses…"
				value={local}
				onChange={handleChange}
				className="h-10 rounded-[10px] border-border-hair bg-bg-elevated pl-10 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-[rgba(244,114,182,0.4)]"
			/>
		</div>
	);
}
