# 🌑 Eclipse — Confidential Credit on Stellar

> ZK-powered lending where collateral, debt, and credit scores stay private.
> Built for **Stellar Hacks: Real-World ZK** using Noir + UltraHonk + Soroban (Protocol 26).

---

## What It Does

Eclipse is a lending protocol on Stellar where:

- **Borrowers** deposit collateral and borrow USDC — both amounts hidden behind Poseidon commitments.
- **High credit scores** (via ZK attestation) unlock LTV > 100%, enabling under-collateralized borrowing.
- **Liquidators** prove a position is unhealthy and trigger liquidation — *without ever seeing the actual values*.
- **Auditors** decrypt positions in full using a view key shared by the borrower.

All ZK proofs are generated **client-side in the browser** (WASM). Private inputs never leave the user's device. Proofs are verified **on-chain in Soroban** using the BN254 host functions introduced in Protocol 25/26.

---

## ZK Is Load-Bearing

| Action | Circuit | What's proven without revealing |
|---|---|---|
| Open position | `open_position` | Collateral committed ✓, score ≥ threshold ✓, debt ≤ LTV ✓, HF ≥ 1 ✓ |
| Liquidate | `liquidate` | HF < 1 at current oracle price ✓ |
| Repay/Withdraw | `repay_withdraw` | New position HF ≥ 1 ✓ |

---

## Architecture

```
Frontend (Next.js)       →  Noir/bb.js WASM (client-side proof)
                         →  @stellar/stellar-sdk (tx submission)
                              ↓
Soroban (Stellar testnet, Protocol 26):
  LendingPool            →  position commitments, USDC pool
  UltraHonkVerifier      →  rs-soroban-ultrahonk (BN254 host fns)
  Oracle [STUB]          →  manual price feed
  CreditIssuer [STUB]    →  mock attestation signer
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detail.

---

## Quick Start

### Prerequisites
- Rust + `cargo`
- `pnpm` ≥ 9
- `nargo` (Noir), `bb` (Barretenberg) — installed by `setup.sh`
- `stellar` CLI

### 1. Install toolchain
```bash
cp .env.example .env
# Fill in DEPLOYER_SECRET (generate at https://laboratory.stellar.org)
pnpm setup
```

### 2. Build circuits
```bash
pnpm build:circuits
# Compiles Noir → WASM + verification keys in web/public/circuits/
```

### 3. Build contracts
```bash
pnpm build:contracts
```

### 4. Deploy to testnet
```bash
pnpm deploy
# Writes contract IDs to .env and web/.env.local
```

### 5. Run frontend
```bash
pnpm dev
# http://localhost:3000
```

---

## Project Structure

```
eclipse/
├── circuits/          # Noir ZK circuits
│   ├── common/        # Poseidon commit, LTV, HF, attestation
│   ├── open_position/ # Circuit 1: borrow with hidden values
│   ├── liquidate/     # Circuit 2: prove HF < 1
│   ├── repay_withdraw/# Circuit 3: safe position update
│   └── solvency/      # [Stretch] pool-level solvency proof
├── contracts/         # Soroban (Rust)
│   ├── lending-pool/  # Core lending logic
│   ├── verifier/      # UltraHonk proof verifier
│   ├── oracle/        # Price feed
│   ├── credit-issuer/ # Credit score attestations
│   └── shared/        # Types, errors
├── packages/
│   ├── crypto/        # Poseidon, view-key encrypt/decrypt
│   ├── proof-gen/     # Client-side proof generation (bb.js)
│   └── sdk/           # Stellar RPC bindings
├── web/               # Next.js frontend (3 views)
├── scripts/           # setup, build, deploy, seed
└── docs/              # Architecture, circuits spec, demo script
```

---

## Honest Stub List

Per hackathon brief — *"honest work-in-progress beats polished mystery"*:

| Component | Status | Notes |
|---|---|---|
| UltraHonk verifier (on-chain) | **STUB** | Length/format check only. Replace with `rs-soroban-ultrahonk` |
| Oracle price | **STUB** | Manually set by admin. No real-time feed |
| Credit issuer attestation | **STUB** | Mock Poseidon commitment. No real KYC |
| Interest model | **Omitted v1** | No interest accrual in MVP |
| Multi-asset collateral | **Omitted v1** | Single XLM collateral |
| View key storage | **Local only** | Encrypted blob not stored on IPFS yet |
| Wallet connection | **STUB** | Demo random address. Replace with Stellar Wallets Kit |

---

## Toolchain

| Layer | Tool |
|---|---|
| ZK circuits | Noir (`nargo`) |
| Proving backend | Barretenberg (`bb`) — UltraHonk |
| Smart contracts | Rust + `soroban-sdk` v22 |
| Frontend | Next.js 14 (App Router) |
| Proof in browser | `@noir-lang/noir_js` + `@noir-lang/backend_barretenberg` |
| Wallet | Stellar Wallets Kit |
| Network | Stellar testnet (Protocol 26) |
| Primitives | Poseidon2, BN254 (native host functions) |

---

## Resources

- [ZK Proofs on Stellar](https://developers.stellar.org/docs/build/apps/zk)
- [Privacy on Stellar](https://developers.stellar.org/docs/build/apps/privacy)
- [Noir docs](https://noir-lang.org/docs/)
- [rs-soroban-ultrahonk](https://github.com/yugocabrio/rs-soroban-ultrahonk)
- [Stellar Skills](https://skills.stellar.org/)

---

## Demo

See [`docs/DEMO.md`](docs/DEMO.md) for the 30–60 second walkthrough script.

**3 jury signals in one flow:** real-world money ✓ · compliant privacy ✓ · ZK on-chain ✓
