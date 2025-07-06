# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Stacks dApp tutorial project built as a monorepo using Turborepo. It demonstrates building a full-stack application with:
- React/Vite frontend (`apps/my-token`)
- React Native/Expo mobile app (`apps/native`)
- Clarity smart contracts (`packages/contracts`)
- Shared TypeScript configurations

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: React 19 + TypeScript + Vite
- **Mobile**: React Native + Expo
- **Smart Contracts**: Clarity (Stacks blockchain)
- **Testing**: Vitest with Clarinet SDK for contract testing
- **Linting**: ESLint with TypeScript support

## Development Commands

### Root Level Commands (from project root)
```bash
# Start all development servers
pnpm dev

# Build all projects
pnpm build

# Clean all build artifacts and node_modules
pnpm clean

# Format all code
pnpm format
```

### Frontend App (`apps/my-token`)
```bash
cd apps/my-token
pnpm dev          # Start Vite dev server
pnpm build        # Build for production
pnpm lint         # Run ESLint
pnpm preview      # Preview production build
```

### Mobile App (`apps/native`)
```bash
cd apps/native
pnpm dev          # Start Expo dev server
pnpm android      # Run on Android
pnpm ios          # Run on iOS
pnpm web          # Run on web
```

### Smart Contracts (`packages/contracts`)
```bash
cd packages/contracts
pnpm test         # Run unit tests
pnpm test:report  # Run tests with coverage and costs
pnpm test:watch   # Watch mode for tests
pnpm build        # Build contract package
pnpm check-types  # TypeScript type checking
pnpm lint         # Run ESLint
```

## Smart Contract Development

### Clarinet Console Commands
Use `clarinet console` to interact with contracts:

```clarity
;; Check balance
(contract-call? .token get-balance tx-sender)

;; Transfer tokens
(contract-call? .token transfer u1 tx-sender 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 none)

;; View assets
::get_assets_maps
```

### Contract Testing
- Tests use Vitest with `vitest-environment-clarinet`
- Simnet environment for testing contract interactions
- Coverage and cost analysis available
- Tests located in `packages/contracts/tests/`

## Project Structure

```
├── apps/
│   ├── my-token/          # React frontend (Vite)
│   └── native/            # React Native mobile app
├── packages/
│   ├── contracts/         # Clarity smart contracts
│   │   ├── src/clarity/   # Contract source files
│   │   ├── tests/         # Contract tests
│   │   └── Clarinet.toml  # Clarinet configuration
│   └── typescript-config/ # Shared TypeScript configs
├── turbo.json             # Turborepo configuration
└── pnpm-workspace.yaml    # Workspace configuration
```

## Key Files

- `turbo.json`: Defines build tasks and caching for Turborepo
- `Clarinet.toml`: Smart contract configuration and deployment settings
- `vitest.config.js`: Test configuration for Clarity contracts
- `pnpm-workspace.yaml`: Workspace package management

## Development Notes

- Use pnpm for package management (required by workspace configuration)
- Node.js >=18 required
- Clarity contracts follow SIP-10 token standard
- Frontend uses React 19 with TypeScript 5.8
- Mobile app uses Expo ~52.0 with React Native 0.76