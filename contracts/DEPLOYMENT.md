# FORJA Smart Contracts — Deployment Guide

## Contracts

| Contract | Description | Default Fee |
|----------|-------------|-------------|
| ForjaTokenFactory | TIP-20 token creation wrapper | 2 USDC |
| ForjaMultisend | Batch token distribution (max 500) | 0.5 USDC |
| ForjaLocker | Token lock with vesting/cliff | 1 USDC |
| ForjaLockerV2 | Batch lock with vesting/cliff | 1 USDC |
| ForjaClaimer | Merkle airdrop claim pages | 1 USDC |
| ForjaLaunchpad | Bonding curve launchpad with Uniswap v4 graduation | 2 USDC (create), 1% (trade) |

## Prerequisites

- [Tempo Foundry fork](https://docs.tempo.xyz/sdk/foundry) installed (`foundryup -n tempo`)
- Deployer wallet funded with pathUSD (gas fees are paid in stablecoins on Tempo)
- Treasury wallet address

**Important**: Tempo has no native gas token. All gas fees are paid in TIP-20 stablecoins (pathUSD, AlphaUSD, etc.) via the Fee AMM. Use `--tempo.fee-token` flag with forge/cast commands.

## Environment Variables

Create a `.env` file in `contracts/`:

```env
# Required
DEPLOYER_PRIVATE_KEY=0x...
TREASURY=0x...your_treasury_address
USDC=0x20C0000000000000000000000000000000000000

# Tempo-specific
TIP20_FACTORY=0x20Fc000000000000000000000000000000000000

# Optional (defaults shown)
CREATE_FEE=20000000
MULTISEND_FEE=3000000
LOCK_FEE=10000000
```

## Fund Deployer (Testnet)

```bash
# Get testnet stablecoins (1M each: pathUSD, AlphaUSD, BetaUSD, ThetaUSD)
cast rpc tempo_fundAddress $DEPLOYER_ADDRESS --rpc-url https://rpc.moderato.tempo.xyz
```

## Deploy to Testnet (Moderato)

```bash
cd contracts

# Load env
source .env

# Deploy (--tempo.fee-token pays gas in pathUSD)
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.moderato.tempo.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --tempo.fee-token 0x20C0000000000000000000000000000000000000
```

## Deploy to Mainnet (Tempo)

```bash
cd contracts

source .env

forge script script/Deploy.s.sol \
  --rpc-url https://rpc.tempo.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --tempo.fee-token 0x20C0000000000000000000000000000000000000
```

## Post-Deployment Verification

Replace `$RPC_URL` with the appropriate RPC endpoint:
- Testnet: `https://rpc.moderato.tempo.xyz`
- Mainnet: `https://rpc.tempo.xyz`

```bash
# Verify ForjaTokenFactory
cast call <FACTORY_ADDRESS> "treasury()(address)" --rpc-url $RPC_URL
cast call <FACTORY_ADDRESS> "createFee()(uint256)" --rpc-url $RPC_URL

# Verify ForjaMultisend
cast call <MULTISEND_ADDRESS> "treasury()(address)" --rpc-url $RPC_URL
cast call <MULTISEND_ADDRESS> "multisendFee()(uint256)" --rpc-url $RPC_URL

# Verify ForjaLocker
cast call <LOCKER_ADDRESS> "treasury()(address)" --rpc-url $RPC_URL
cast call <LOCKER_ADDRESS> "lockFee()(uint256)" --rpc-url $RPC_URL
```

## Deployed Addresses

### Tempo Mainnet (Chain ID: 4217)

| Contract | Address |
|----------|---------|
| ForjaTokenFactory | `0xC513F939402ED2e751Ca315AB0388F9c176e3bE0` |
| ForjaMultisend | `0x315e9CF87DbbCF38F41b8705A298FCAB9E1Ae787` |
| ForjaLocker | `0x6d2F881e84b5D87579d2735510104b76AD728BBa` |
| ForjaLockerV2 | `0xaaa41385264DF29465ce05f25062b602fC6C66Ac` |
| ForjaClaimer | `0xe1Fd3DDa0160ddBb4C4e7Ab3Cbdaa816557970C6` |
| ForjaLaunchpad | `0x3Da57c1502c95A7626213fEf7c1297CdF5Fb3362` |

**Deployer/Treasury**: `0x60aD30D45ebc64E1F9DC10ae9C1c30729Cd0c8A7`
**Deployed**: 2026-04-01 (core), 2026-04-07 (LockerV2), 2026-04-10 (Claimer), 2026-04-12 (Launchpad)
**Fees**: Create 2 USDC, Multisend 0.5 USDC, Lock 1 USDC, Claim 1 USDC, Launchpad Create 2 USDC + 1% trade

### Moderato Testnet (Chain ID: 42431)

| Contract | Address |
|----------|---------|
| ForjaTokenFactory | `0xC513F939402ED2e751Ca315AB0388F9c176e3bE0` |
| ForjaMultisend | `0x315e9CF87DbbCF38F41b8705A298FCAB9E1Ae787` |
| ForjaLocker | `0x6d2F881e84b5D87579d2735510104b76AD728BBa` |
| ForjaLaunchpad | `0xf5Bb91Ce1336cFD3882F65A835d9d41d1F2E020b` |

**Deployer/Treasury**: `0x60aD30D45ebc64E1F9DC10ae9C1c30729Cd0c8A7`
**Deployed**: 2026-03-31 (core), 2026-04-12 (Launchpad)
**Note**: Uniswap v4 not deployed on Moderato — graduation cannot be tested on testnet.

**E2E Verification** (2026-04-01):
- Test token: Forja Lock Test (FLT) at `0x20c000000000000000000000f787c74e992465a7`
- createLock #1 (1000 FLT, 120s, 30s cliff, vesting, revocable): `0x2af90e7722d0fdf9095363b7180f5fc4b11a3fb4478b351649686d4750eb4a35`
- claim (Lock #1, 850 FLT vested): `0x1b4ec9ff4d2895fb6a588a182e12de228e60d72cf1e81f3e08367a45159553f0`
- createLock #2 (500 FLT, no vesting, revocable): `0xcf4247978cc99b6cdf1268e2f3f20a823b471e723657fd54760d6c38a88d4ba1`
- revokeLock (Lock #2, 500 FLT returned): `0x8d739ac2b0f937b15a86c08b7bec570e398336f345b7105dfa4e66d564f60d90`

## Key Addresses (Tempo)

| Name | Address |
|------|---------|
| TIP-20 Factory | `0x20Fc000000000000000000000000000000000000` |
| pathUSD (USDC) | `0x20C0000000000000000000000000000000000000` |
| Uniswap v4 PoolManager | `0x33620f62c5b9b2086dd6b62f4a297a9f30347029` |
| Uniswap v4 PositionManager | `0x3fc79444f8eacc1894775493ff3fa41f1e35ce11` |

## Fee Management (Post-Deploy)

Current fees: Create 2 USDC, Multisend 0.5 USDC, Lock 1 USDC (TIP-20 6 decimals).

```bash
# Update fees (owner only) — values in TIP-20 units (6 decimals)
# Example: set Create=5 USDC, Multisend=1 USDC, Lock=2 USDC
cast send <FACTORY_ADDRESS> "setCreateFee(uint256)" 5000000 \
  --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz \
  --tempo.fee-token 0x20C0000000000000000000000000000000000000
cast send <MULTISEND_ADDRESS> "setMultisendFee(uint256)" 1000000 \
  --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz \
  --tempo.fee-token 0x20C0000000000000000000000000000000000000
cast send <LOCKER_ADDRESS> "setLockFee(uint256)" 2000000 \
  --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz \
  --tempo.fee-token 0x20C0000000000000000000000000000000000000

# Update treasury (owner only)
cast send <FACTORY_ADDRESS> "setTreasury(address)" <NEW_TREASURY> \
  --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz \
  --tempo.fee-token 0x20C0000000000000000000000000000000000000
```
