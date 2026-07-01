# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Eclipse** — confidential lending on Stellar. Borrowers deposit collateral and borrow USDC with amounts and credit scores hidden behind Poseidon commitments; ZK proofs (Noir + UltraHonk) attest that positions are healthy without revealing the numbers; auditors decrypt full positions via a view key. Built for the "Stellar Hacks: Real-World ZK" hackathon. Proofs are generated **client-side in the browser (WASM)** and verified **on-chain in Soroban**.

`IDEA.md` is the original project brief (in Indonesian) — the authoritative source for intended scope and feature list. `README.md` and `docs/` describe current implementation.

## Three independent toolchains

This monorepo deliberately keeps three build systems side-by-side — do **not** try to unify them:

| Layer | Tool | Location | Manager |
|---|---|---|---|
| ZK circuits | `nargo` (Noir) + `bb` (Barretenberg) | `circuits/` | Nargo workspace (`circuits/Nargo.toml`) |
| Smart contracts | `cargo` + `stellar` CLI (`soroban-sdk`) | `contracts/` | Cargo workspace (`contracts/Cargo.toml`) |
| Frontend + TS libs | `pnpm` + Next.js / `tsc` | `web/`, `packages/*` | pnpm workspace (`pnpm-workspace.yaml`) |

The data that flows between them: circuits compile to artifacts that land in `web/public/circuits/` so the browser can prove; contracts deploy and their IDs flow into `web/.env.local`; the SDK package is the single place frontend + scripts read contract addresses.

## Commands

All run from repo root. `pnpm setup` installs the full toolchain (nargo, bb, stellar CLI) and funds a testnet account — run once.

```bash
pnpm build:circuits   # nargo compile all circuits → web/public/circuits/*.json, then gen-vk.mjs → *.vk.json
pnpm build:contracts  # cargo/soroban build all contract members → wasm
pnpm deploy           # stellar CLI deploys 4 contracts, writes IDs to .env + web/.env.local
pnpm dev              # next dev (http://localhost:3000)
pnpm build            # next build
```

Single-component work:
- Circuits: `cd circuits/<name> && nargo compile` (or `nargo test`, `nargo execute`).
- Contracts: `cd contracts && cargo build --target wasm32-unknown-unknown --release` / `cargo test`.
- Frontend lint: `cd web && pnpm lint`.

## Critical version + path coupling (read before editing build scripts)

- **Noir/bb is pinned to `0.36.0`.** `scripts/gen-vk.mjs` and the deploy node scripts import the backend by a **hardcoded `node_modules/.pnpm/...@0.36.0/...` path**. Bumping `@noir-lang/*` or `@stellar/stellar-sdk` versions in `package.json` will break these scripts unless the hardcoded paths are updated too. Circuit Noir version must match this backend version or proofs won't verify.
- **VK generation does not use the `bb` CLI.** `build-circuits.sh` skips `bb write_vk` (libunwind crash on macOS); verification keys are produced instead by `gen-vk.mjs` running the `UltraHonkBackend` from JS. So `pnpm build:circuits` is two steps: compile (bash) + VK gen (node).
- `build-circuits.sh` compiles **5** circuits (incl. `solvency`); `gen-vk.mjs` does the **4** used on-chain (`open_position`, `liquidate`, `repay_withdraw`, `claim_payment`). `solvency` is a stretch/recursive circuit.

## Deploy: two paths, same outcome

- `scripts/deploy.sh` (used by `pnpm deploy`) — uses the `stellar` CLI with the `deployer` identity.
- `scripts/deploy-node.mjs` + `scripts/init-contracts.mjs` + `scripts/seed-node.mjs` — pure-Node alternative using `@stellar/stellar-sdk` directly (needed when the CLI path isn't viable). `init-contracts` registers VKs and wires contract refs; `seed` creates demo attestations/positions. These set `NODE_TLS_REJECT_UNAUTHORIZED=0` — **testnet only, never production**.

After any deploy, contract IDs are written to `.env` (idempotently — both deploy paths strip the four existing `*_ID` lines and rewrite them, so re-deploys overwrite rather than accumulate duplicate keys) and as `NEXT_PUBLIC_*` vars to `web/.env.local` (overwritten each run). `packages/sdk/src/config.ts` reads only those env vars — never hardcode contract IDs elsewhere.

## Cross-language invariants (these are load-bearing)

The ZK system only works if hashing matches across Noir, Rust, and TS:

- **Commitment** = `Poseidon2([value, salt], 2)` (see `circuits/common/src/lib.nr`). The TS implementation in `packages/crypto` and the on-chain Poseidon2 host function must produce identical field elements.
- **LTV schedule** (`ltv_bps`): score ≥700 → 120% (under-collateralized), ≥500 → 75%, else 50%.
- **Credit attestation** = `Poseidon2([borrower_address, credit_score, issuer_nonce], 3)`.
- **Nullifier** = `Poseidon2([secret_key, position_id], 2)`.
Changing any of these in one language requires changing it in all three.

## Honest stubs — do not assume these are real

Per the hackathon "honest WIP" ethos, several components are deliberate stubs:

- **On-chain UltraHonk verifier** (`contracts/verifier/src/lib.rs`) only sanity-checks (proof non-empty, public inputs %32==0). It does **not** cryptographically verify. The real implementation is `rs-soroban-ultrahonk`. `CircuitId` enum (OpenPosition=0, Liquidate=1, RepayWithdraw=2, ClaimPayment=3) maps circuits to stored VKs.
- **Oracle** — admin sets price manually, no real feed.
- **CreditIssuer** — mock Poseidon commitment, no real KYC/signature.
- No interest accrual, single XLM collateral, view keys stored in-browser only, wallet connect may be stubbed.

When asked to "make X work for real," the target is usually replacing one of these stubs.

## Layout

- `circuits/common/src/lib.nr` — shared Noir primitives (commit, ltv, health factor, attestation, nullifier). The three on-chain circuits import from here.
- `contracts/` — Cargo workspace: `shared` (types/events), `verifier`, `oracle`, `credit-issuer`, `lending-pool` (core: stores position commitments, manages USDC pool, calls verifier), `payment-pool` (confidential payment links: `lock` funds behind a commitment, `claim` releases them against a `claim_payment` proof + nullifier). Release profile is `panic=abort`, `opt-level=z`, LTO — standard Soroban size-tuning.
- `packages/` — `crypto` (TS Poseidon + view-key encrypt/decrypt), `proof-gen` (bb.js + Noir WASM browser proving), `sdk` (contract bindings + Stellar RPC + config).
- `web/app/` — Next.js App Router with three role views: `/borrower`, `/liquidator`, `/auditor`, the confidential payment-link flow (`/pay/create`, `/pay/claim/[commitment]`), plus landing `page.tsx`. Payment-link helpers live in `web/lib/payments.ts`.
- `docs/` — `ARCHITECTURE.md`, `CIRCUITS.md` (per-circuit public vs private I/O), `DEMO.md`, `DEPLOYMENT.md`.
- `skills/` — vendored Stellar skill references (read-only docs, not part of the build).
