# Launchpad Incident Runbook

Operational procedures for ForjaLaunchpad incidents on Tempo mainnet.

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Fund loss, contract exploit | Immediate |
| P1 | Contract malfunction, graduation failure | < 1 hour |
| P2 | Indexer desync, UI bugs | < 4 hours |
| P3 | Cosmetic, non-blocking | Next business day |

---

## P0: Emergency Pause

**When**: Suspected exploit, unexpected fund movement, or critical vulnerability discovered.

### Steps

1. **Pause the contract immediately**
   ```
   cast send $LAUNCHPAD_ADDRESS "pause()" --private-key $OWNER_KEY --rpc-url $TEMPO_RPC
   ```

2. **Verify pause**
   ```
   cast call $LAUNCHPAD_ADDRESS "paused()(bool)" --rpc-url $TEMPO_RPC
   # Should return: true
   ```

3. **Check USDC balance**
   ```
   cast call $USDC_ADDRESS "balanceOf(address)(uint256)" $LAUNCHPAD_ADDRESS --rpc-url $TEMPO_RPC
   ```

4. **Notify team** via designated channel

5. **Investigate root cause** before unpausing

6. **If funds are at risk**: Users can call `emergencyWithdraw(launchId)` while paused to reclaim USDC proportional to their token holdings.

### Emergency Withdraw Details

- Users must approve their launch tokens for the launchpad contract
- Refund = `(userTokenBalance / realTokensSold) * realUsdcRaised`
- Each withdrawal reduces both realTokensSold and realUsdcRaised proportionally
- After all holders withdraw, pool drains to zero

---

## P1: Kill a Specific Launch

**When**: A specific launch is problematic (scam token, broken graduation) but other launches are fine.

### Steps

1. **Kill the launch** (keeps contract running for other launches)
   ```
   cast send $LAUNCHPAD_ADDRESS "killLaunch(uint256)" $LAUNCH_ID --private-key $OWNER_KEY --rpc-url $TEMPO_RPC
   ```

2. **Verify**
   ```
   cast call $LAUNCHPAD_ADDRESS "launches(uint256)(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,bool)" $LAUNCH_ID --rpc-url $TEMPO_RPC
   # killed should be true
   ```

3. Users can sell tokens back via the bonding curve (sell-only mode). Buys are blocked.

---

## P1: Graduation Failure

**When**: A launch reaches the graduation threshold but Uniswap v4 pool creation or LP mint fails.

### Behavior

- Contract automatically sets `failed = true` and emits `LaunchFailed`
- Users can sell their tokens back via the curve
- No manual intervention needed for user exit

### Investigation

1. Check the failed transaction on explorer
2. Common causes:
   - Pool already initialized (duplicate graduation)
   - PositionManager approval issue
   - Insufficient token balance in contract
3. If fixable: a new launch with the same token parameters may be needed

---

## P2: Indexer Desync

**When**: Frontend shows stale data, trades not appearing, or incorrect stats.

### Diagnosis

1. **Check indexer state**
   ```sql
   SELECT * FROM indexer_state WHERE contract_name = 'ForjaLaunchpad';
   ```

2. **Compare on-chain vs DB**
   ```
   cast call $LAUNCHPAD_ADDRESS "getLaunchInfo(uint256)(address,address,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,bool)" $LAUNCH_ID --rpc-url $TEMPO_RPC
   ```
   Compare with:
   ```sql
   SELECT * FROM launches WHERE launch_id = '$LAUNCH_ID';
   ```

### Fix

1. **Re-index from a specific block**
   Update `indexer_state.last_indexed_block` to a block before the missing events:
   ```sql
   UPDATE indexer_state SET last_indexed_block = $BLOCK_NUM WHERE contract_name = 'ForjaLaunchpad';
   ```

2. **Trigger manual sync**
   ```
   curl -H "x-api-key: $INDEXER_API_KEY" https://forja.fun/api/cron/index
   ```

3. **If tokenHubCache badge is missing**
   ```sql
   UPDATE token_hub_cache SET is_launchpad_token = true WHERE address = '$TOKEN_ADDRESS';
   ```

---

## P2: Daily Creation Cap Issues

**When**: Legitimate creator blocked by daily cap.

### Check Current Count

```
cast call $LAUNCHPAD_ADDRESS "dailyLaunchCount(address,uint256)(uint256)" $CREATOR_ADDRESS $(echo "$(date +%s) / 86400" | bc) --rpc-url $TEMPO_RPC
```

### Resolution

- Cap resets at UTC midnight (epoch day boundary)
- No admin override exists by design — wait for next day
- If persistent issue, consider adjusting MAX_LAUNCHES_PER_DAY via contract upgrade

---

## Unpause Procedure

**After** root cause is identified and fixed:

1. **Verify the fix** (testnet or code review)
2. **Unpause**
   ```
   cast send $LAUNCHPAD_ADDRESS "unpause()" --private-key $OWNER_KEY --rpc-url $TEMPO_RPC
   ```
3. **Monitor** for 1 hour: check trades, graduations, indexer sync
4. **Post-incident review** within 48 hours

---

## Key Addresses

| Item | Address |
|------|---------|
| ForjaLaunchpad | TBD (pre-deploy) |
| USDC (pathUSD) | 0x20c0...0000 |
| Treasury | TBD |
| PoolManager | 0x3362... |
| PositionManager | 0x3fc7... |
| Owner | TBD |

---

## Contact

| Role | Contact |
|------|---------|
| Contract Owner | TBD |
| Indexer Admin | VPS SSH: `ssh forja-server` |
| DB Admin | `docker exec forja-postgres psql -U forja -d forja` |
