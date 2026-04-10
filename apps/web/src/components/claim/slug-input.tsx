"use client";

import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { validateSlug } from "@/actions/claims";
import { Input } from "@/components/ui/input";
import { isValidSlug, normalizeSlug } from "@/lib/merkle";

interface SlugInputProps {
	value: string;
	onChange: (value: string) => void;
	onValidityChange: (valid: boolean) => void;
	disabled?: boolean;
}

type SlugStatus = "idle" | "checking" | "ok" | "bad";

export function SlugInput({ value, onChange, onValidityChange, disabled }: SlugInputProps) {
	const [status, setStatus] = useState<SlugStatus>("idle");
	const [reason, setReason] = useState<string | null>(null);

	useEffect(() => {
		const slug = normalizeSlug(value);
		if (!slug) {
			setStatus("idle");
			setReason(null);
			onValidityChange(false);
			return;
		}
		if (!isValidSlug(slug)) {
			setStatus("bad");
			setReason("3-40 chars, a-z 0-9 hyphen, must start/end alphanumeric");
			onValidityChange(false);
			return;
		}

		setStatus("checking");
		setReason(null);
		const handle = setTimeout(async () => {
			const result = await validateSlug(slug);
			if (result.ok) {
				setStatus("ok");
				setReason(null);
				onValidityChange(true);
			} else {
				setStatus("bad");
				setReason(result.reason ?? "Invalid slug");
				onValidityChange(false);
			}
		}, 400);
		return () => clearTimeout(handle);
	}, [value, onValidityChange]);

	const icon =
		status === "checking" ? (
			<LoaderIcon className="size-4 animate-spin text-smoke-dark" />
		) : status === "ok" ? (
			<CheckCircleIcon className="size-4 text-emerald-500" />
		) : status === "bad" ? (
			<XCircleIcon className="size-4 text-rose-500" />
		) : null;

	return (
		<div className="space-y-1.5">
			<label htmlFor="claim-slug" className="block text-sm font-medium text-foreground">
				Slug (URL)
			</label>
			<div className="relative">
				<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-smoke-dark">
					forja.fun/claim/
				</span>
				<Input
					id="claim-slug"
					type="text"
					inputMode="text"
					autoComplete="off"
					placeholder="my-airdrop"
					className="pl-32 pr-9"
					value={value}
					onChange={(e) => onChange(e.target.value.toLowerCase())}
					disabled={disabled}
				/>
				{icon && <span className="absolute inset-y-0 right-3 flex items-center">{icon}</span>}
			</div>
			{reason && <p className="text-xs text-rose-500">{reason}</p>}
		</div>
	);
}
