import { type NextRequest, NextResponse } from "next/server";

/**
 * Generate a cryptographically-random nonce for per-request CSP.
 * Uses `crypto.getRandomValues` → base64 (Edge-runtime compatible).
 */
function generateNonce(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	// base64 without padding; Edge runtime supports btoa on binary strings
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/=+$/, "");
}

export function proxy(request: NextRequest) {
	const nonce = generateNonce();
	const isDev = process.env.NODE_ENV === "development";

	// Next.js dev/HMR needs 'unsafe-eval'; production must NOT include it.
	// `'unsafe-inline'` stays as a fallback for older browsers — modern browsers
	// ignore it when `'strict-dynamic'` + nonce are both present (Google/Stripe pattern).
	const scriptSrc = [
		"'self'",
		`'nonce-${nonce}'`,
		"'strict-dynamic'",
		"https:",
		"'unsafe-inline'",
		isDev ? "'unsafe-eval'" : "",
	]
		.filter(Boolean)
		.join(" ");

	const csp = [
		"default-src 'self'",
		`script-src ${scriptSrc}`,
		`style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
		"img-src 'self' data: blob: https://esm.sh https://*.tempo.xyz https://*.walletconnect.com",
		"font-src 'self' data:",
		[
			"connect-src 'self'",
			"https://rpc.tempo.xyz",
			"https://rpc.moderato.tempo.xyz",
			"wss://*.walletconnect.com",
			"wss://*.walletconnect.org",
			"https://*.walletconnect.com",
			"https://*.walletconnect.org",
			"https://openpanel.dev",
			"https://api.openpanel.dev",
			"https://*.tempo.xyz",
			"https://contracts.tempo.xyz",
		].join(" "),
		"frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'",
		"upgrade-insecure-requests",
	].join("; ");

	// Forward nonce to downstream RSC via request header so Server Components can read it.
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-nonce", nonce);

	const response = NextResponse.next({ request: { headers: requestHeaders } });

	response.headers.set("Content-Security-Policy", csp);
	response.headers.set("x-nonce", nonce);
	response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), midi=()",
	);
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set("Cross-Origin-Resource-Policy", "same-site");
	response.headers.set("X-DNS-Prefetch-Control", "on");

	return response;
}

export const config = {
	matcher: [
		// Run on all routes except static assets and image optimizer output.
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
