import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const CONTRACTS: Array<{ name: string; address: string; note?: string }> = [
	{ name: "ForjaTokenFactory", address: "0xC513F939402ED2e751Ca315AB0388F9c176e3bE0" },
	{ name: "ForjaMultisend", address: "0x315e9CF87DbbCF38F41b8705A298FCAB9E1Ae787" },
	{ name: "ForjaLocker (v1)", address: "0x6d2F881e84b5D87579d2735510104b76AD728BBa" },
	{ name: "ForjaLocker (v2)", address: "0xaaa41385264DF29465ce05f25062b602fC6C66Ac" },
	{ name: "ForjaClaimer", address: "0xe1Fd3DDa0160ddBb4C4e7Ab3Cbdaa816557970C6" },
	{ name: "ForjaLaunchpad", address: "0x3Da57c1502c95A7626213fEf7c1297CdF5Fb3362" },
	{ name: "ForjaSwapRouter (v2)", address: "0xbbb6dc000ecac860487089cd177102a61f38bb19" },
];

const SEVERITY_ROWS: Array<{ level: string; color: string; examples: string }> = [
	{
		level: "Critical",
		color: "text-red-500",
		examples:
			"Direct loss of user funds, unauthorized withdrawal from Locker/Claimer/Launchpad, bypass of access control on owner-only methods.",
	},
	{
		level: "High",
		color: "text-molten-amber",
		examples:
			"Permanent lock of user assets, privilege escalation on API routes, authenticated session hijack, supply corruption of indexed token data.",
	},
	{
		level: "Medium",
		color: "text-indigo-400",
		examples:
			"Stored/reflected XSS in public pages, CSRF on state-changing API routes, denial-of-service against indexer, price-feed manipulation without fund loss.",
	},
	{
		level: "Low",
		color: "text-smoke-dark",
		examples:
			"Information disclosure of non-sensitive metadata, missing security headers, rate-limit bypass on read-only endpoints.",
	},
];

function sourcifyUrl(address: string) {
	return `https://repo.sourcify.dev/contracts/full_match/4217/${address}/`;
}

export default function SecurityPage() {
	return (
		<PageContainer className="py-10 sm:py-14">
			<PageHeader
				title="Security Policy"
				description="Vulnerability disclosure, scope, and safe-harbor terms for FORJA."
			/>

			<div className="mt-8 space-y-6">
				<Card>
					<CardContent className="space-y-3">
						<h2 className="text-xl font-semibold tracking-tight">Reporting a Vulnerability</h2>
						<p className="text-sm text-smoke-dark">
							If you believe you have found a security vulnerability affecting FORJA, please report
							it privately. Do not open a public GitHub issue, post in community channels, or
							attempt to exploit the issue beyond what is necessary to confirm it.
						</p>
						<ul className="list-disc space-y-1 pl-5 text-sm text-smoke-dark">
							<li>
								Email:{" "}
								<a
									href="mailto:security@forja.fun"
									className="text-indigo-400 underline-offset-4 hover:underline"
								>
									security@forja.fun
								</a>
							</li>
							<li>Response SLA: within 72 hours of receipt.</li>
							<li>PGP key: available on request via the address above.</li>
						</ul>
						<p className="text-sm text-smoke-dark">
							Please include reproduction steps, affected component, impact assessment, and any
							relevant transaction hashes or URLs.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="space-y-4">
						<h2 className="text-xl font-semibold tracking-tight">Scope (In-Scope)</h2>

						<div className="space-y-2">
							<h3 className="text-base font-semibold">Frontend &amp; API</h3>
							<ul className="list-disc space-y-1 pl-5 text-sm text-smoke-dark">
								<li>
									<span className="font-medium text-foreground">forja.fun</span> — Next.js
									application, all public routes.
								</li>
								<li>
									All API routes under{" "}
									<code className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs">
										forja.fun/api/*
									</code>
									.
								</li>
							</ul>
						</div>

						<div className="space-y-2">
							<h3 className="text-base font-semibold">
								Smart Contracts (Tempo mainnet, chain 4217)
							</h3>
							<p className="text-sm text-smoke-dark">
								All contracts have verified source on Sourcify. Click the Sourcify link next to each
								address to inspect the canonical source.
							</p>
							<ul className="space-y-1.5 text-sm text-smoke-dark">
								{CONTRACTS.map((c) => (
									<li
										key={c.address}
										className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
									>
										<span className="font-medium text-foreground">{c.name}</span>
										<code className="break-all rounded bg-surface-elevated px-1.5 py-0.5 text-xs">
											{c.address}
										</code>
										<a
											href={sourcifyUrl(c.address)}
											target="_blank"
											rel="noreferrer"
											className="text-xs text-indigo-400 underline-offset-4 hover:underline"
										>
											Sourcify
										</a>
										{c.note ? <span className="text-xs text-smoke-dark/80">({c.note})</span> : null}
									</li>
								))}
							</ul>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="space-y-3">
						<h2 className="text-xl font-semibold tracking-tight">Out of Scope</h2>
						<ul className="list-disc space-y-1 pl-5 text-sm text-smoke-dark">
							<li>
								Third-party contracts (Uniswap v4 PoolManager, Permit2, TIP-20 factory precompile,
								enshrined DEX precompile).
							</li>
							<li>User-deployed tokens created via the ForjaTokenFactory.</li>
							<li>External token issuers' contracts indexed for discovery.</li>
							<li>
								Findings that require physical access, social engineering of FORJA staff, or
								compromised end-user devices.
							</li>
							<li>Automated scanner output without a working proof-of-concept.</li>
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="space-y-3">
						<h2 className="text-xl font-semibold tracking-tight">Severity Guidelines</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-b border-border">
										<th className="py-2 pr-4 font-semibold">Severity</th>
										<th className="py-2 font-semibold">Examples</th>
									</tr>
								</thead>
								<tbody>
									{SEVERITY_ROWS.map((row) => (
										<tr key={row.level} className="border-b border-border/50 last:border-0">
											<td className={`py-3 pr-4 align-top font-medium ${row.color}`}>
												{row.level}
											</td>
											<td className="py-3 align-top text-smoke-dark">{row.examples}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="space-y-3">
						<h2 className="text-xl font-semibold tracking-tight">Safe Harbor</h2>
						<p className="text-sm text-smoke-dark">
							FORJA will not pursue legal action against researchers who conduct good-faith security
							research in accordance with this policy. Good-faith research includes avoiding privacy
							violations, destruction of data, disruption of service, and exfiltration of funds or
							user data beyond what is strictly necessary to demonstrate the issue.
						</p>
						<p className="text-sm text-smoke-dark">
							If legal action is initiated by a third party against a researcher who has complied
							with this policy, we will make it known that the activity was authorized.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="space-y-3">
						<h2 className="text-xl font-semibold tracking-tight">Rewards</h2>
						<p className="text-sm text-smoke-dark">
							FORJA does not currently operate a paid bug-bounty program. Valid reports will receive
							public acknowledgment (with researcher consent) and a permanent listing in the FORJA
							Hall of Fame published on this page.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="space-y-2">
						<h2 className="text-xl font-semibold tracking-tight">Hall of Fame</h2>
						<p className="text-sm text-smoke-dark">
							No entries yet. Be the first — report responsibly and get listed here.
						</p>
					</CardContent>
				</Card>

				<p className="pt-2 text-xs text-smoke-dark">Last updated: 2026-04-18</p>
			</div>
		</PageContainer>
	);
}
