# FORJA Smart Contracts — Deployment Guide

## Contracts

| Contract | Description | Default Fee |
|----------|-------------|-------------|
| ForjaTokenFactory | TIP-20 token creation wrapper | 20 USDC |
| ForjaMultisend | Batch token distribution (max 500) | 3 USDC |
| ForjaLocker | Token lock with vesting/cliff | 10 USDC |

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
| ForjaTokenFactory | TBD |
| ForjaMultisend | TBD |
| ForjaLocker | TBD |

### Moderato Testnet (Chain ID: 42431)

| Contract | Address |
|----------|---------|
| ForjaTokenFactory | `0xC513F939402ED2e751Ca315AB0388F9c176e3bE0` |
| ForjaMultisend | `0x315e9CF87DbbCF38F41b8705A298FCAB9E1Ae787` |
| ForjaLocker | `0x6d2F881e84b5D87579d2735510104b76AD728BBa` |

**Deployer/Treasury**: `0x60aD30D45ebc64E1F9DC10ae9C1c30729Cd0c8A7`
**Deployed**: 2026-03-31

## Key Addresses (Tempo)

| Name | Address |
|------|---------|
| TIP-20 Factory | `0x20Fc000000000000000000000000000000000000` |
| pathUSD (USDC) | `0x20C0000000000000000000000000000000000000` |

## Fee Management (Post-Deploy)

```bash
# Update fees (owner only)
cast send <FACTORY_ADDRESS> "setCreateFee(uint256)" 30000000 --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz
cast send <MULTISEND_ADDRESS> "setMultisendFee(uint256)" 5000000 --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz
cast send <LOCKER_ADDRESS> "setLockFee(uint256)" 15000000 --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz

# Update treasury (owner only)
cast send <FACTORY_ADDRESS> "setTreasury(address)" <NEW_TREASURY> --private-key $DEPLOYER_PRIVATE_KEY --rpc-url https://rpc.tempo.xyz
```
