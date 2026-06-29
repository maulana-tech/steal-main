# AGENTS.md — Eclipse

ZK lending on Stellar (Noir + UltraHonk + Soroban). Built for Stellar Hacks: Real-World ZK.

## Primer

`CLAUDE.md` is the authoritative instruction file — read it first. This file fills gaps an agent would otherwise guess wrong.

## Package manager

**pnpm** only. Never npm or yarn. Lockfile: `pnpm-lock.yaml`. Workspace: `pnpm-workspace.yaml`.

```
pnpm dev              # next dev (web/)
pnpm build:circuits   # nargo compile → gen-vk.mjs
pnpm build:contracts  # stellar contract build
pnpm deploy           # stellar CLI deploy → .env + web/.env.local
pnpm build            # next build
```

## Three independent toolchains — don't unify

| Layer | Tool | Dir | Manager |
|---|---|---|---|
| ZK circuits | `nargo` (Noir) + `bb` | `circuits/` | `circuits/Nargo.toml` (workspace) |
| Smart contracts | Rust + `soroban-sdk` | `contracts/` | `contracts/Cargo.toml` (workspace) |
| Frontend + TS | Next.js 14 / `tsc` | `web/`, `packages/*` | pnpm workspace |

Circuits compile → `web/public/circuits/*.json`. Contracts deploy → IDs → `web/.env.local` → `packages/sdk/src/config.ts`.

## Version coupling (load-bearing)

- **Noir/bb pinned to 0.36.0.** `scripts/gen-vk.mjs` and deploy Node scripts import via hardcoded `.pnpm/...@0.36.0/...` paths. Bumping `@noir-lang/*` or `@stellar/stellar-sdk` breaks these scripts unless paths are updated too.
- `pnpm build:circuits` = bash compile + node VK gen. VK gen uses `UltraHonkBackend` from JS, **not** `bb write_vk` (libunwind crash on macOS).
- `build-circuits.sh` compiles 4 circuits; `gen-vk.mjs` generates VKs for only 3 (omits `solvency`).

## Cross-language invariant

Poseidon2 hashing must produce identical field elements in Noir, JS (`packages/crypto`), and on-chain Soroban host function. Changing `circuits/common/src/lib.nr` requires updating `packages/crypto/src/index.ts` and any Rust callers. Key formulas:

- Commitment = `Poseidon2([value, salt], 2)`
- Attestation = `Poseidon2([borrower, score, nonce], 3)`
- Nullifier = `Poseidon2([secret_key, position_id], 2)`
- LTV: score≥700→120%, ≥500→75%, else 50%

## Honest stubs (hackathon WIP)

- **On-chain verifier** (`contracts/verifier/src/lib.rs`): sanity-checks only (proof non-empty, public inputs %32==0). Real impl is `rs-soroban-ultrahonk`.
- **Oracle**: admin sets price manually.
- **CreditIssuer**: mock Poseidon commitment, no real KYC.
- No interest accrual, single XLM collateral, view keys local-only, wallet connect stubbed.

## Web/Next.js quirks

- `next.config.mjs` sets `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` (required for SharedArrayBuffer/WASM).
- WASM-heavy Noir packages (`@noir-lang/*`, `@eclipse/proof-gen`) are excluded from server bundle via `config.externals`.
- `transpilePackages: ["@eclipse/crypto", "@eclipse/sdk"]` — these are raw TS with `"main": "./src/index.ts"` (no build step).
- TypeScript paths in `tsconfig.json`: `@eclipse/crypto`, `@eclipse/proof-gen`, `@eclipse/sdk` resolve via `paths`.
- CSS: Tailwind + `globals.css` with `.liquid-glass`, `.card`, `.btn-*`, `.input` utility classes.

## Testing and lint

- Frontend lint: `cd web && pnpm lint` (next lint).
- Contracts: `cd contracts && cargo test`.
- Circuits: `cd circuits/<name> && nargo test`.
- No root-level `pnpm lint` or `pnpm typecheck` — these must be run per-package.
- No CI workflows (`.github/workflows/` doesn't exist).

## Deploy

Two paths, same outcome:
1. `pnpm deploy` (bash, uses `stellar` CLI with `deployer` identity).
2. `node scripts/deploy-node.mjs && node scripts/init-contracts.mjs && node scripts/seed-node.mjs` (pure-Node, uses `@stellar/stellar-sdk` directly).

Set `DEPLOYER_SECRET` in `.env`. Node scripts hardcode `NODE_TLS_REJECT_UNAUTHORIZED=0` — testnet only.

Contract IDs come from env vars (`NEXT_PUBLIC_*`) — never hardcode them. Read from `packages/sdk/src/config.ts`.

## Contracts

- Release profile: `panic=abort`, `opt-level=z`, LTO.
- `.cargo/config.toml`: `target-feature=-reference-types,-bulk-memory` for WASM.

## Unrelated files

- `PROMPT.md` is about a different project (Asme landing page). Ignore it.
