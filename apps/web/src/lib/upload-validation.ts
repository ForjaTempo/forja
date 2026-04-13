import "server-only";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type AllowedMimeType = (typeof ALLOWED_TYPES)[number];

const MAGIC_BYTES: { bytes: number[]; offset: number; mime: AllowedMimeType }[] = [
	{ bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0, mime: "image/png" },
	{ bytes: [0xff, 0xd8, 0xff], offset: 0, mime: "image/jpeg" },
	{ bytes: [0x47, 0x49, 0x46, 0x38], offset: 0, mime: "image/gif" },
	// WebP: starts with RIFF....WEBP
	{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: "image/webp" },
];

export function detectMimeType(buffer: Buffer): AllowedMimeType | null {
	for (const { bytes, offset, mime } of MAGIC_BYTES) {
		if (buffer.length < offset + bytes.length) continue;

		let match = true;
		for (let i = 0; i < bytes.length; i++) {
			if (buffer[offset + i] !== bytes[i]) {
				match = false;
				break;
			}
		}

		if (match) {
			// Extra check for WebP: bytes 8-11 should be "WEBP"
			if (mime === "image/webp") {
				if (
					buffer.length >= 12 &&
					buffer[8] === 0x57 &&
					buffer[9] === 0x45 &&
					buffer[10] === 0x42 &&
					buffer[11] === 0x50
				) {
					return mime;
				}
				continue;
			}
			return mime;
		}
	}
	return null;
}

export interface ValidationResult {
	valid: boolean;
	mimeType?: AllowedMimeType;
	error?: string;
}

export function validateImageFile(buffer: Buffer): ValidationResult {
	if (buffer.length === 0) {
		return { valid: false, error: "Empty file" };
	}

	if (buffer.length > MAX_FILE_SIZE) {
		return { valid: false, error: "File too large (max 5MB)" };
	}

	const mime = detectMimeType(buffer);
	if (!mime) {
		return { valid: false, error: "Invalid image format. Allowed: PNG, JPEG, WebP, GIF" };
	}

	return { valid: true, mimeType: mime };
}

// In-memory rate limiter: 10 uploads per wallet per hour
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

const uploadCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(wallet: string): { allowed: boolean; error?: string } {
	const now = Date.now();
	const key = wallet.toLowerCase();
	const entry = uploadCounts.get(key);

	if (!entry || now >= entry.resetAt) {
		uploadCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW });
		return { allowed: true };
	}

	if (entry.count >= RATE_LIMIT) {
		return { allowed: false, error: "Upload rate limit exceeded (10/hour)" };
	}

	entry.count++;
	return { allowed: true };
}
