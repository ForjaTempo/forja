import { headers } from "next/headers";

/**
 * Read the per-request CSP nonce forwarded by `src/proxy.ts`.
 * Use on any inline <script>/<style> tag or <Script nonce={...}> so it
 * passes the `script-src 'nonce-...' 'strict-dynamic'` policy.
 */
export async function getNonce(): Promise<string | undefined> {
	const h = await headers();
	return h.get("x-nonce") ?? undefined;
}
