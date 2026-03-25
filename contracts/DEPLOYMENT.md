# FORJA Smart Contracts — Deployment Guide

## Contracts

| Contract | Description | Default Fee |
|----------|-------------|-------------|
| ForjaTokenFactory | TIP-20 token creation wrapper | 20 USDC |
| ForjaMultisend | Batch token distribution (max 500) | 3 USDC |
| ForjaLocker | Token lock with vesting/cliff | 10 USDC |

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Deployer wallet with TEMPO for gas
- Treasury wallet address

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

## Deploy to Testnet (Moderato)

```bash
cd contracts

# Load env
source .env

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.moderato.tempo.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

## Deploy to Mainnet (Tempo)

```bash
cd contracts

source .env

forge script script/Deploy.s.sol \
  --rpc-url https://rpc.tempo.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

## Post-Deployment Verification

```bash
# Verify ForjaTokenFactory
cast call <FACTORY_ADDRESS> "treasury()(address)" --rpc-url https://rpc.tempo.xyz
cast call <FACTORY_ADDRESS> "createFee()(uint256)" --rpc-url https://rpc.tempo.xyz

# Verify ForjaMultisend
cast call <MULTISEND_ADDRESS> "treasury()(address)" --rpc-url https://rpc.tempo.xyz
cast call <MULTISEND_ADDRESS> "multisendFee()(uint256)" --rpc-url https://rpc.tempo.xyz

# Verify ForjaLocker
cast call <LOCKER_ADDRESS> "treasury()(address)" --rpc-url https://rpc.tempo.xyz
cast call <LOCKER_ADDRESS> "lockFee()(uint256)" --rpc-url https://rpc.tempo.xyz
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
| ForjaTokenFactory | TBD |
| ForjaMultisend | TBD |
| ForjaLocker | TBD |

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
