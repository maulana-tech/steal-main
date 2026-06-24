# Eclipse — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js)                                       │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Borrower   │  │  Liquidator  │  │    Auditor    │  │
│  │  /borrower  │  │  /liquidator │  │   /auditor    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │           │
│  ┌──────▼────────────────▼──────────────┐    │           │
│  │  @eclipse/proof-gen (Noir + bb.js)   │    │           │
│  │  ← WASM runs entirely in browser     │    │           │
│  │  ← Private inputs NEVER leave device │    │           │
│  └──────────────────┬────────────────── ┘    │           │
│                     │                        │           │
│  ┌──────────────────▼────────────────────────▼────────┐ │
│  │  @eclipse/sdk  (Stellar SDK + contract bindings)   │ │
│  └──────────────────────────┬──────────────────────── ┘ │
└─────────────────────────────┼───────────────────────────┘
                              │ Stellar RPC
                              ▼
┌─────────────────────────────────────────────────────────┐
│  Stellar Testnet (Protocol 26 / Yardstick)               │
│                                                          │
│  ┌────────────────┐    ┌────────────────────────────┐   │
│  │  LendingPool   │───▶│  UltraHonkVerifier         │   │
│  │  (lib.rs)      │    │  (fork rs-soroban-ultrahonk)│   │
│  │                │    │  ← BN254 host functions     │   │
│  │  - Positions   │    │  ← Poseidon2 native         │   │
│  │  - USDC pool   │    └────────────────────────────┘   │
│  └────────┬───────┘                                      │
│           │                                              │
│  ┌────────▼───────┐    ┌────────────────────────────┐   │
│  │  Oracle        │    │  CreditIssuer              │   │
│  │  [STUB: manual]│    │  [STUB: mock-signed attest] │   │
│  └────────────────┘    └────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Privacy Model

| Data                   | On-chain           | Borrower  | Liquidator | Auditor   |
|------------------------|---------------------|-----------|------------|-----------|
| Collateral amount      | Commitment (hash)   | ✅ Plaintext | ❌ Hidden | ✅ Via view key |
| Debt amount            | Commitment (hash)   | ✅ Plaintext | ❌ Hidden | ✅ Via view key |
| Credit score           | Commitment (hash)   | ✅ Plaintext | ❌ Hidden | ✅ Via view key |
| Health factor          | —                   | ✅ Computed | ❌ Hidden  | ✅ Via view key |
| Position active?       | ✅ Visible          | ✅         | ✅         | ✅         |
| Nullifier hash         | ✅ Visible          | ✅         | ✅         | ✅         |

## ZK Proof Flow

```
Borrower device:
  private inputs → [Noir circuit WASM] → UltraHonk proof
                                              │
                                    public inputs (commitments,
                                    nullifier, oracle price)
                                              │
                                              ▼
                              Stellar LendingPool.open_position()
                                              │
                                              ▼
                              VerifierContract.verify(CircuitId::OpenPosition, proof)
                                              │
                             BN254 pairings via Protocol 26 host functions
                                              │
                                         true/false
```

## Honest Stubs (v1)

The following components are intentionally simplified for the hackathon MVP:

| Component | Production approach | MVP stub |
|---|---|---|
| Oracle price | Pyth / Band / Chainlink | Admin manually sets price |
| Credit issuer | KYC provider + EdDSA sig | Mock Poseidon commitment |
| UltraHonk verifier | Full rs-soroban-ultrahonk | Length/format sanity check |
| Interest model | Variable rate (curve) | Ignored |
| Multi-asset | Multiple collateral types | Single XLM collateral |
| View key storage | IPFS / encrypted events | Local browser only |
