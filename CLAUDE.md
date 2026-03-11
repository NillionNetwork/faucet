# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nillion Faucet — a testnet faucet web app for claiming NIL tokens on **L1 (Ethereum Sepolia)** via an on-chain smart contract, or on **L2 (Nillion Testnet)** via a server-side API that sends ETH + NIL. Users switch between L1/L2 using RainbowKit's built-in chain switcher.

## Commands

| Command                               | Description                                                     |
| ------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                            | Start Next.js dev server (Turbopack) on localhost:3000          |
| `pnpm build`                          | Production build                                                |
| `pnpm fix`                            | Format + lint everything (web + contracts)                      |
| `pnpm fix:web`                        | Run oxfmt, oxlint (with type-aware + --fix), and tsgo typecheck |
| `pnpm fix:contracts`                  | Run forge fmt + solhint on Solidity                             |
| `pnpm docker:up` / `pnpm docker:down` | Start/stop local nil-anvil (port 8545)                          |
| `pnpm docker:deploy`                  | Deploy faucet contract to local anvil                           |
| `forge build`                         | Build contracts (run from `contracts/` dir)                     |
| `forge test`                          | Run contract tests (from `contracts/` dir)                      |

**CI runs:** `pnpm fmt --check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` for web; `forge fmt --check`, `solhint`, `forge build`, `forge test` for contracts.

## Architecture

**Three-part system:**

1. **Smart contract** (`contracts/src/NILFaucet.sol`) — Ownable/Pausable ERC-20 faucet with cooldown for L1. Uses OpenZeppelin v5 (via git submodules). Deployed per-chain, address set in env vars.
2. **Next.js 16 frontend** (`src/`) — React 19, Tailwind v4, wagmi v3 + viem for chain interaction, RainbowKit for wallet connection, shadcn/ui (new-york style) for components.
3. **L2 server-side faucet** (`src/lib/l2/`, `src/app/api/faucet/`) — Node.js API routes that use a private key to send ETH + NIL (ERC-20) on Nillion Testnet. Rate-limited via Redis (ioredis).

**Key source layout:**

- `src/lib/wagmi.ts` — Chain config (Sepolia, Nillion Testnet, Anvil in dev). Defines `nillionTestnet` chain.
- `src/lib/contracts.ts` — Shared ABIs (faucet + ERC-20), `getFaucetConfig()` resolves contract address + explorer URL per chain. Constants: `NILLION_TESTNET_CHAIN_ID`, `NILLION_TESTNET_RPC_URL`.
- `src/lib/l2/faucet.ts` — Server-side viem logic: `sendPayout()` sends ETH then NIL sequentially, `getL2FaucetConfig()` returns drip amounts, `checkFunding()` validates balances. Singleton `FaucetContext` (lazy-initialized).
- `src/lib/l2/rate-limit.ts` — Redis cooldown: `checkCooldown()`, `markCooldown()`, `getCooldownMs()`. Key prefix: `nillion:faucet:l2:cooldown`.
- `src/lib/l2/redis.ts` — Singleton ioredis client via `getRedisClient()`.
- `src/app/api/faucet/route.ts` — POST: validate address → check cooldown → send payout → mark cooldown.
- `src/app/api/faucet/status/route.ts` — GET: returns L2 drip config + cooldown remaining for an address.
- `src/hooks/useFaucetStatus.ts` — L1: reads faucet state (drip amount, cooldown, canClaim, user balance) via multicall, polls every 15s.
- `src/hooks/useClaim.ts` — L1: write hook for `claim()` tx with wallet confirmation → pending → success lifecycle.
- `src/hooks/useL2Claim.ts` — L2: calls POST `/api/faucet`, tracks status/tx hashes/errors, returns `retryAfterMs` for cooldown.
- `src/hooks/useL2Status.ts` — L2: fetches GET `/api/faucet/status` for drip config + cooldown.
- `src/app/components/FaucetCard.tsx` — Main UI: branches on `chainId === NILLION_TESTNET_CHAIN_ID` to render L1 or L2 content.
- `src/app/components/L2FaucetContent.tsx` — L2 UI: balance display, claim button with cooldown timer, dynamic drip amounts from API.
- `src/app/components/ClientProviders.tsx` — wagmi/RainbowKit/QueryClient providers.

**L1 contract architecture:** `NILFaucet` wraps an immutable ERC-20 `TOKEN` reference. `canClaim(address)` returns `(bool, string)` where the string is a reason code: `PAUSED`, `DRIP_0`, `EMPTY`, `COOLDOWN`. The frontend maps these to UI states directly.

**L2 flow:** Client POSTs wallet address → server checks Redis cooldown → server sends ETH transfer then ERC-20 transfer sequentially (avoids nonce collisions) → marks cooldown in Redis → returns both tx hashes.

## Code Conventions

- **Imports:** Use `@/*` path alias (maps to `./src/*`). Relative imports beyond `../../` are banned by oxlint.
- **Formatting:** oxfmt for TS/JS, forge fmt for Solidity.
- **Linting:** oxlint with type-aware checking (typescript, import, unicorn, react, vitest plugins). Key rules: no `any`, explicit return types (warn), max 1000 lines/file, max 400 lines/function, no nested ternaries.
- **Solidity:** solhint with recommended rules + gas optimizations (custom errors, indexed events, increment-by-one).
- **Type checking:** Uses `tsgo` (native TypeScript compiler preview), not `tsc`.
- **Package manager:** pnpm 10+ (lockfile: `pnpm-lock.yaml`). Node 24+.
- **Contract dependencies:** OpenZeppelin via git submodules (check out with `--recursive`), remapped as `@openzeppelin/contracts/`.

## Environment Variables

See `.env.example`. Key vars:

**L1 (client-side):**

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — Required for WalletConnect
- `NEXT_PUBLIC_FAUCET_ADDRESS_SEPOLIA` / `NEXT_PUBLIC_FAUCET_ADDRESS_ANVIL` — Contract addresses per chain
- `NEXT_PUBLIC_SEPOLIA_RPC_URL` / `NEXT_PUBLIC_ANVIL_RPC_URL` — Optional RPC overrides

**L2 (server-side):**

- `L2_FAUCET_PRIVATE_KEY` — Private key for the faucet wallet on Nillion Testnet
- `L2_NIL_TOKEN_ADDRESS` — NIL ERC-20 contract address on Nillion Testnet
- `REDIS_URL` — Redis connection URL for rate limiting
- `L2_FAUCET_COOLDOWN_MS` — Cooldown between claims (default: 86400000 = 24h)
- `L2_FAUCET_ETH_AMOUNT` — ETH drip per claim (default: 0.0001)
- `L2_FAUCET_NIL_AMOUNT` — NIL drip per claim (default: 70)

## Docs update

Any relevant change to the overall repository infrastructure must be reflected here, either after the implementation of the changes or whenever detected.
