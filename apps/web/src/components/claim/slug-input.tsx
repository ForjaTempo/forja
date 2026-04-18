"use client";

import { CheckCircleIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { validateSlug } from "@/actions/claims";
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
			setReason("3–40 chars · a–z 0–9 hyphen · must start/end alphanumeric");
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
			<LoaderIcon className="size-4 animate-spin text-text-tertiary" />
		) : status === "ok" ? (
			<CheckCircleIcon className="size-4 text-green" />
		) : status === "bad" ? (
			<XCircleIcon className="size-4 text-red" />
		) : null;

	return (
		<div className="space-y-2">
			<label
				htmlFor="claim-slug"
				className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary"
			>
				Slug · URL
			</label>
			<div className="relative">
				<span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-[13px] text-text-tertiary">
					forja.fun/claim/
				</span>
				<input
					id="claim-slug"
					type="text"
					inputMode="text"
					autoComplete="off"
					placeholder="my-airdrop"
					className="w-full rounded-xl border border-border-hair bg-bg-field py-3 pr-10 pl-[138px] font-mono text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none transition-colors"
					value={value}
					onChange={(e) => onChange(e.target.value.toLowerCase())}
					disabled={disabled}
				/>
				{icon && <span className="absolute inset-y-0 right-3 flex items-center">{icon}</span>}
			</div>
			{reason && <p className="text-[12px] text-red">{reason}</p>}
		</div>
	);
}
