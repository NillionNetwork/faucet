# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nillion Faucet — a testnet faucet web app for claiming NIL tokens on **Ethereum Sepolia** via on-chain smart contracts.

The landing page offers the **two Sepolia faucets** — Blind Computer and Blacklight L1, which are two different NIL tokens on one chain. See "Two faucets on one chain" below for how a token is selected, and note that the selector chooses a token, not a network.

**The L2 (Nillion Testnet, chain 78651) faucet has been removed** — the L2 is winding down. `?chain=L2` now falls through to the default (Blind Computer) faucet.

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
3. **Blacklight relayer** (`src/lib/blacklight/`, `src/app/api/faucet/blacklight/`) — server-side API route that sends Blacklight L1 NIL on Sepolia to a pasted address. Rate-limited via Redis (ioredis).

**Key source layout:**

- `src/lib/wagmi.ts` — Chain config (Sepolia, Anvil in dev).
- `src/lib/contracts.ts` — Shared ABIs (faucet + ERC-20), `getFaucetConfig(chainId, variant?)` resolves contract address + explorer URL. Constants: `ANVIL_CHAIN_ID`, `BLACKLIGHT_CHAIN_PARAM`. Type: `FaucetVariant`.
- `src/hooks/useFaucetVariant.ts` — resolves the faucet **variant** from `?chain=`; see "Two faucets on one chain" below.
- `src/lib/redis.ts` — Singleton ioredis client via `getRedisClient()`, used by the Blacklight relayer's cooldown.
- `src/hooks/useFaucetStatus.ts` — L1: reads faucet state (drip amount, cooldown, canClaim, user balance) via multicall, polls every 15s.
- `src/hooks/useClaim.ts` — L1: write hook for `claim()` tx with wallet confirmation → pending → success lifecycle.
- `src/app/components/FaucetCard.tsx` — Main UI: connect/claim card, plus the paste-an-address relayer field on the Blacklight variant.
- `src/app/components/ClientProviders.tsx` — wagmi/RainbowKit/QueryClient providers.

**L1 contract architecture:** `NILFaucet` wraps an immutable ERC-20 `TOKEN` reference. `canClaim(address)` returns `(bool, string)` where the string is a reason code: `PAUSED`, `DRIP_0`, `EMPTY`, `COOLDOWN`. The frontend maps these to UI states directly.

**Two faucets on one chain (the `variant` concept):** Sepolia hosts the original NIL faucet **and** one for Blacklight L1's NIL — a different ERC-20 at a different address: the staging stack's NIL `0x38E6D66fCbe15B7D68aa2E25Ba065A6c6da0c367`, deployed 2026-09-29, which the Blacklight L1 testnet webapp uses. It replaced the 2026-08-25 token (`0xA7526a2ABB3D01BD21B3ac59B9201cC018560Dfd`), now deprecated. `TOKEN` is immutable, so one contract cannot serve both tokens; each needs its own `NILFaucet` instance.

Because both are on chain 11155111, `chainId` cannot distinguish them, and the app was keyed on `chainId` alone. A **variant** does the disambiguating:

- `?chain=blacklight` → variant `"blacklight"` → `NEXT_PUBLIC_FAUCET_ADDRESS_SEPOLIA_BLACKLIGHT`
- anything else (`?chain=L1`, no param, or a retired value like `?chain=L2`) → variant `undefined` → the chain's default, i.e. **existing behaviour, unchanged**

`useFaucetVariant()` reads it **synchronously** rather than in an effect, on purpose: resolving a tick late would let the first render of `?chain=blacklight` read the _default_ faucet, painting the wrong token's balance and drip, and a fast click could send `claim()` to the wrong contract. It is `window`-guarded for SSR.

Everything downstream is automatic — the UI reads `TOKEN`, `dripAmount` and `cooldownSeconds` _from the contract_, so pointing at a different faucet gets the right token, drip and cooldown with no further wiring.

If its env var is unset the card says "Faucet not configured" rather than falling back to the other faucet — a silent fallback between two different NILs is the one failure mode worth refusing outright.

**The landing page now offers the two SEPOLIA faucets, not two chains:** "Blind Computer" (`?chain=L1`, the original NIL) and "Blacklight L1" (`?chain=blacklight`). Both are Sepolia, so the cards pick a _token_, and the in-page label repeats the card's wording so the two screens cannot disagree about which faucet you are on.

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
- `NEXT_PUBLIC_FAUCET_ADDRESS_SEPOLIA_BLACKLIGHT` — the Blacklight L1 NIL faucet on Sepolia, reached only via `?chain=blacklight`. Needs its own deployed `NILFaucet` (drip 20 NIL = `20000000`, cooldown `86400`), funded with that token. Moving to a new token means deploying a new `NILFaucet` and pointing this at it
- `NEXT_PUBLIC_SEPOLIA_RPC_URL` / `NEXT_PUBLIC_ANVIL_RPC_URL` — Optional RPC overrides

**Server-side:**

- `REDIS_URL` — Redis connection URL for the Blacklight relayer's rate limiting
- `BLACKLIGHT_FAUCET_*` / `BLACKLIGHT_NIL_TOKEN_ADDRESS` — Blacklight relayer config; see `.env.example`

## Docs update

Any relevant change to the overall repository infrastructure must be reflected here, either after the implementation of the changes or whenever detected.
