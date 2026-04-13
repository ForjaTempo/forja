# Launchpad Go/No-Go Checklist

Pre-mainnet deployment gate for ForjaLaunchpad contract and frontend.
**Status**: Canary beta LIVE (2026-04-12). First real launch/graduation pending.

## Smart Contract

- [x] All forge tests pass (106/106)
- [x] Emergency withdraw tested: pro-rata refund based on token balance
- [x] Daily creation cap tested: 5/day limit, resets on epoch day boundary
- [x] Graduation flow tested: Uniswap v4 pool init + LP mint to 0xdead *(unit tests only — Uniswap v4 not on Moderato testnet)*
- [x] Kill/fail flow tested: sell-only exit works, buy reverts
- [x] Anti-snipe: per-block cap (10% of graduation threshold), max single buy ($5K)
- [x] Fee accounting: 1% trading fee, 50/50 creator/treasury split
- [x] Timeout: 30-day auto-fail with markLaunchAsFailed
- [x] Pausable: owner can pause/unpause, buy/sell/create blocked when paused
- [x] No reentrancy: all external functions use nonReentrant
- [x] Token roles renounced after graduation

## Frontend

- [x] `/launch` — list page with Hot/New/Graduated tabs
- [x] `/launch/create` — wizard with USDC approval + create flow
- [x] `/launch/[id]` — detail page with bonding curve chart, trade panel, trade history
- [x] Price impact warning: >5% yellow, >15% red
- [x] Sell-only mode for killed/failed launches
- [x] Success share flow: View Launch + Share on X + Copy Link
- [x] Feature gate: NEXT_PUBLIC_LAUNCHPAD_ENABLED + NEXT_PUBLIC_FORJA_LAUNCHPAD

## Database & Indexer

- [x] Migration 0004 (launches + launch_trades) applied
- [x] Migration 0005 (isLaunchpadToken) applied
- [x] Indexer handles all 6 event types: LaunchCreated, TokenBought, TokenSold, Graduated, LaunchKilled, LaunchFailed
- [x] Atomic transactions: insert trade + update aggregate in db.transaction()
- [x] Graduated event: upsert tokenHubCache with isLaunchpadToken = true
- [x] Idempotent: onConflictDoNothing for duplicate events

## Environment

- [x] NEXT_PUBLIC_LAUNCHPAD_ENABLED=true in .env.local
- [x] NEXT_PUBLIC_FORJA_LAUNCHPAD=0x3Da57c1502c95A7626213fEf7c1297CdF5Fb3362
- [x] Contract deployed with correct constructor args (tipFactory, usdc, pathUsd, treasury, poolManager, positionManager, createFee)
- [x] Treasury address set to deployer (0x60aD30D45ebc64E1F9DC10ae9C1c30729Cd0c8A7)
- [x] Contract owner set (for pause/kill/fee admin)

## Operational Readiness

- [x] Incident runbook reviewed
- [x] Monitoring: indexer logs, contract events, USDC balance
- [x] Pause procedure tested on testnet (2026-04-12)
- [x] Emergency withdraw procedure tested on testnet (2026-04-12)
- [x] Rollback plan: pause contract + disable feature gate

## Testnet E2E Results (Moderato, 2026-04-12)

| Operation | Gas | Status |
|-----------|-----|--------|
| createLaunch | ~5M (incl. token creation) | PASS |
| buy | ~370K | PASS |
| sell | ~120K | PASS |
| pause + emergencyWithdraw | ~88K | PASS |
| killLaunch | ~279K | PASS |
| graduation | N/A | SKIP (Uniswap v4 not on Moderato) |

## Production Validation (Pending)

- [ ] First real mainnet launch created and indexed
- [ ] First real buy + sell cycle completed
- [ ] Indexer: launches + launch_trades rows match on-chain state
- [ ] First graduation: Uniswap v4 LP minted to 0xdead, badge shown in Token Hub
- [ ] 1-month canary beta incident-free OR external audit completed

## Deployed Addresses

| Network | Address |
|---------|---------|
| Moderato (testnet) | `0xf5Bb91Ce1336cFD3882F65A835d9d41d1F2E020b` |
| Tempo (mainnet) | `0x3Da57c1502c95A7626213fEf7c1297CdF5Fb3362` |

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Dev | — | 2026-04-12 | Canary beta |
| Security | — | | |
| Ops | — | | |
