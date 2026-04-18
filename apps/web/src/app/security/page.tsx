import { PageContainer } from "@/components/layout/page-container";

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
		color: "text-red",
		examples:
			"Direct loss of user funds, unauthorized withdrawal from Locker/Claimer/Launchpad, bypass of access control on owner-only methods.",
	},
	{
		level: "High",
		color: "text-ember",
		examples:
			"Permanent lock of user assets, privilege escalation on API routes, authenticated session hijack, supply corruption of indexed token data.",
	},
	{
		level: "Medium",
		color: "text-indigo",
		examples:
			"Stored/reflected XSS in public pages, CSRF on state-changing API routes, denial-of-service against indexer, price-feed manipulation without fund loss.",
	},
	{
		level: "Low",
		color: "text-text-tertiary",
		examples:
			"Information disclosure of non-sensitive metadata, missing security headers, rate-limit bypass on read-only endpoints.",
	},
];

function sourcifyUrl(address: string) {
	return `https://repo.sourcify.dev/contracts/full_match/4217/${address}/`;
}

const cardCls = "rounded-2xl border border-border-hair bg-bg-elevated p-6 sm:p-7";
const h2Cls = "font-display text-[22px] tracking-[-0.01em] text-text-primary";
const codeCls =
	"inline-flex break-all rounded bg-bg-field px-1.5 py-0.5 font-mono text-[11px] text-text-secondary";

export default function SecurityPage() {
	return (
		<PageContainer className="py-16 sm:py-20">
			<div className="mx-auto max-w-4xl">
				<header className="space-y-3">
					<div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.08)] py-1 pl-1 pr-3 text-[12px] text-green">
						<span className="rounded-sm bg-green px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-[#062017]">
							/SEC
						</span>
						Security policy
					</div>
					<h1
						className="m-0 font-display font-normal leading-[0.95] tracking-[-0.03em]"
						style={{ fontSize: "clamp(32px, 5vw, 52px)" }}
					>
						Disclose safely. <span className="gold-text italic">Ship trust.</span>
					</h1>
					<p className="max-w-xl text-[14.5px] text-text-secondary">
						Vulnerability disclosure, scope, and safe-harbor terms for FORJA.
					</p>
				</header>

				<div className="mt-10 space-y-5">
					<section className={cardCls}>
						<h2 className={h2Cls}>Reporting a vulnerability</h2>
						<p className="mt-3 text-[14px] text-text-secondary">
							If you believe you have found a security vulnerability affecting FORJA, please report
							it privately. Do not open a public GitHub issue, post in community channels, or
							attempt to exploit the issue beyond what is necessary to confirm it.
						</p>
						<ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-text-secondary">
							<li>
								Email{" "}
								<a
									href="mailto:security@forja.fun"
									className="text-gold underline-offset-4 hover:underline"
								>
									security@forja.fun
								</a>
							</li>
							<li>Response SLA: within 72 hours of receipt.</li>
							<li>PGP key: available on request via the address above.</li>
						</ul>
						<p className="mt-3 text-[13px] text-text-tertiary">
							Please include reproduction steps, affected component, impact assessment, and any
							relevant transaction hashes or URLs.
						</p>
					</section>

					<section className={cardCls}>
						<h2 className={h2Cls}>Scope · in-scope</h2>

						<div className="mt-4 space-y-2">
							<h3 className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
								Frontend &amp; API
							</h3>
							<ul className="list-disc space-y-1 pl-5 text-[14px] text-text-secondary">
								<li>
									<span className="font-medium text-text-primary">forja.fun</span> — Next.js app,
									all public routes.
								</li>
								<li>
									All API routes under <code className={codeCls}>forja.fun/api/*</code>
								</li>
							</ul>
						</div>

						<div className="mt-5 space-y-2">
							<h3 className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.14em]">
								Smart contracts · Tempo mainnet, chain 4217
							</h3>
							<p className="text-[13.5px] text-text-secondary">
								All contracts have verified source on Sourcify. Click each link to inspect the
								canonical source.
							</p>
							<ul className="space-y-2 text-[13.5px]">
								{CONTRACTS.map((c) => (
									<li
										key={c.address}
										className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
									>
										<span className="font-medium text-text-primary">{c.name}</span>
										<code className={codeCls}>{c.address}</code>
										<a
											href={sourcifyUrl(c.address)}
											target="_blank"
											rel="noreferrer"
											className="font-mono text-[11px] text-gold uppercase tracking-[0.1em] underline-offset-4 hover:underline"
										>
											Sourcify
										</a>
										{c.note ? (
											<span className="text-[12px] text-text-tertiary">({c.note})</span>
										) : null}
									</li>
								))}
							</ul>
						</div>
					</section>

					<section className={cardCls}>
						<h2 className={h2Cls}>Out of scope</h2>
						<ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-text-secondary">
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
					</section>

					<section className={cardCls}>
						<h2 className={h2Cls}>Severity guidelines</h2>
						<div className="mt-4 overflow-x-auto">
							<table className="w-full text-left text-[13.5px]">
								<thead>
									<tr className="font-mono text-[10px] text-text-tertiary uppercase tracking-[0.12em]">
										<th className="py-2 pr-4 font-medium">Severity</th>
										<th className="py-2 font-medium">Examples</th>
									</tr>
								</thead>
								<tbody>
									{SEVERITY_ROWS.map((row) => (
										<tr key={row.level} className="border-border-hair border-t">
											<td
												className={`py-3 pr-4 align-top font-mono text-[11px] uppercase tracking-[0.12em] ${row.color}`}
											>
												{row.level}
											</td>
											<td className="py-3 align-top text-text-secondary">{row.examples}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					<section className={cardCls}>
						<h2 className={h2Cls}>Safe harbor</h2>
						<p className="mt-3 text-[14px] text-text-secondary">
							FORJA will not pursue legal action against researchers who conduct good-faith security
							research in accordance with this policy. Good-faith research includes avoiding privacy
							violations, destruction of data, disruption of service, and exfiltration of funds or
							user data beyond what is strictly necessary to demonstrate the issue.
						</p>
						<p className="mt-3 text-[13.5px] text-text-tertiary">
							If legal action is initiated by a third party against a researcher who has complied
							with this policy, we will make it known that the activity was authorized.
						</p>
					</section>

					<section className={cardCls}>
						<h2 className={h2Cls}>Rewards</h2>
						<p className="mt-3 text-[14px] text-text-secondary">
							FORJA does not currently operate a paid bug-bounty program. Valid reports will receive
							public acknowledgment (with researcher consent) and a permanent listing in the FORJA
							Hall of Fame published on this page.
						</p>
					</section>

					<section className={cardCls}>
						<h2 className={h2Cls}>Hall of fame</h2>
						<p className="mt-3 text-[14px] text-text-tertiary">
							No entries yet. Be the first — report responsibly and get listed here.
						</p>
					</section>

					<p className="pt-2 font-mono text-[11px] text-text-tertiary uppercase tracking-[0.14em]">
						Last updated · 2026-04-18
					</p>
				</div>
			</div>
		</PageContainer>
	);
}
