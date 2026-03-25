# FORJA

Token toolkit for [Tempo blockchain](https://tempo.xyz) (Chain ID: 4217).

**Create. Send. Lock.**

## Tools

- **Token Create** — Deploy TIP-20 tokens with custom parameters
- **Multisend** — Batch transfer tokens to multiple addresses
- **Token Lock** — Lock tokens with time-based vesting

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5.8
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Blockchain**: Wagmi, Viem, Foundry, OpenZeppelin 5
- **Database**: PostgreSQL + Drizzle ORM
- **Monorepo**: pnpm + Turborepo
- **Linting**: Biome

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
forja/
├── apps/web/          # Next.js frontend
├── packages/config/   # Shared TypeScript configs
├── packages/db/       # Database schema & client
└── contracts/         # Solidity smart contracts
```

## Development

```bash
pnpm run check        # Biome lint & format
pnpm run typecheck    # TypeScript check
pnpm run build        # Production build
pnpm run test         # Run tests
```

## Contributing

1. Create a feature branch from `develop`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/)
3. Open a PR against `develop`
4. Ensure CI passes

## License

[MIT](LICENSE)
