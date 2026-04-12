# Launchpad Go/No-Go Checklist

Pre-mainnet deployment gate for ForjaLaunchpad contract and frontend.

## Smart Contract

- [ ] All forge tests pass (106/106)
- [ ] Emergency withdraw tested: pro-rata refund based on token balance
- [ ] Daily creation cap tested: 5/day limit, resets on epoch day boundary
- [ ] Graduation flow tested: Uniswap v4 pool init + LP mint to 0xdead
- [ ] Kill/fail flow tested: sell-only exit works, buy reverts
- [ ] Anti-snipe: per-block cap (10% of graduation threshold), max single buy ($5K)
- [ ] Fee accounting: 1% trading fee, 50/50 creator/treasury split
- [ ] Timeout: 30-day auto-fail with markLaunchAsFailed
- [ ] Pausable: owner can pause/unpause, buy/sell/create blocked when paused
- [ ] No reentrancy: all external functions use nonReentrant
- [ ] Token roles renounced after graduation

## Frontend

- [ ] `/launch` — list page with Hot/New/Graduated tabs
- [ ] `/launch/create` — wizard with USDC approval + create flow
- [ ] `/launch/[id]` — detail page with bonding curve chart, trade panel, trade history
- [ ] Price impact warning: >5% yellow, >15% red
- [ ] Sell-only mode for killed/failed launches
- [ ] Success share flow: View Launch + Share on X + Copy Link
- [ ] Feature gate: NEXT_PUBLIC_LAUNCHPAD_ENABLED + NEXT_PUBLIC_FORJA_LAUNCHPAD

## Database & Indexer

- [ ] Migration 0004 (launches + launch_trades) applied
- [ ] Migration 0005 (isLaunchpadToken) applied
- [ ] Indexer handles all 6 event types: LaunchCreated, TokenBought, TokenSold, Graduated, LaunchKilled, LaunchFailed
- [ ] Atomic transactions: insert trade + update aggregate in db.transaction()
- [ ] Graduated event: upsert tokenHubCache with isLaunchpadToken = true
- [ ] Idempotent: onConflictDoNothing for duplicate events

## Environment

- [ ] NEXT_PUBLIC_LAUNCHPAD_ENABLED=true in .env.local
- [ ] NEXT_PUBLIC_FORJA_LAUNCHPAD=0x... (deployed contract address)
- [ ] Contract deployed with correct constructor args (tipFactory, usdc, pathUsd, treasury, poolManager, positionManager, createFee)
- [ ] Treasury address set to operational multisig
- [ ] Contract owner set (for pause/kill/fee admin)

## Operational Readiness

- [ ] Incident runbook reviewed by team
- [ ] Monitoring: indexer logs, contract events, USDC balance
- [ ] Pause procedure tested on testnet
- [ ] Emergency withdraw procedure tested on testnet
- [ ] Rollback plan documented

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Dev | | | |
| Security | | | |
| Ops | | | |
