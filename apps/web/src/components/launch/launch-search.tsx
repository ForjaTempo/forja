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
			<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-smoke-dark" />
			<Input
				type="text"
				placeholder="Search by name, symbol, or token address..."
				value={local}
				onChange={handleChange}
				className="h-10 border-anvil-gray-light bg-obsidian-black/50 pl-10 text-smoke placeholder:text-smoke-dark"
			/>
		</div>
	);
}
