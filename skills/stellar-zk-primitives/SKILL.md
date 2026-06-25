---
name: stellar-zk-primitives
description: Understand on-chain ZK verification primitives on Stellar/Soroban — BN254 pairing host functions, Poseidon/Poseidon2 hashing, and Groth16 proof verification — as used by the zkNemo verifier contract. Use when encoding proofs for the verifier, debugging verification failures, or reasoning about hashing.
---

# Stellar ZK primitives (BN254 / Poseidon / Groth16)

Background for how zkNemo's on-chain Verifier checks proofs. zkNemo does not author the verifier (PoC provides it), but the frontend must encode proofs/public inputs to match.

## Enabling protocol upgrades
- **X-Ray (Protocol 25)** added BN254 + Poseidon host functions → on-chain pairing/EC for zk-SNARKs.
  https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
- **Yardstick (Protocol 26)** made proof verification cheaper.
  https://stellar.org/blog/foundation-news/stellar-yardstick-protocol-26-upgrade-guide

## Primitives
- **BN254** — pairing-friendly curve used by Groth16. Proof points (A, B, C) and public inputs are BN254 field elements. Encoding/endianness must match the verifier ABI exactly.
  Soroban SDK: https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_bn254/index.html
- **Poseidon / Poseidon2** — ZK-friendly hash used for commitments / Merkle trees in the circuits. Hash domain + parameters must match the circuit.
  Soroban SDK: https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_poseidon/index.html
- **Groth16** — succinct proof system; constant-size proof, cheap on-chain verify against a trusted setup (`.zkey` / verification key).

## Docs
- ZK Proofs on Stellar: https://developers.stellar.org/docs/build/apps/zk
- Privacy on Stellar: https://developers.stellar.org/docs/build/apps/privacy
- ZK Proofs skill: https://skills.stellar.org/skills/zk-proofs/SKILL.md

## What zkNemo's frontend must get right
- Serialize proof + public signals from snarkjs into the **exact** byte layout the Verifier expects (copy the PoC client).
- Use the **same Poseidon params** the circuit uses when computing commitments/nullifiers client-side.
- Use latest SDK for Protocol 26 support.

## Official Stellar ZK-Proofs skill — guidance (mirrored)
Source: https://skills.stellar.org/skills/zk-proofs/SKILL.md

Covers four layers: (A) proof-verification primitives, (B) hash primitives, (C) SDK ergonomics/bindings, (D) operational cost envelope.

**Version-verify before building** (primitives are protocol-version gated):
1. Check CAP status in the `stellar-protocol` repo.
2. Confirm target network protocol + software version.
3. Confirm `soroban-sdk` release compatibility.
4. Confirm a production example exists for your proving system (here: Circom/Groth16 via the PoC).

**Architecture patterns:**
- **Verification gateway** — isolate crypto checks in a dedicated contract module (smaller audit surface). PoC's Verifier already does this.
- **Policy-and-proof split** — separate verifier (validity) / policy (ASP allow-deny) / app (state). Maps to PoC Pool + ASP contracts.
- **Feature flags** — gate advanced paths on verified primitive availability with deterministic fallback.

**Risk areas to avoid:** unvalidated proof payloads · missing replay/nullifier controls · monolithic design · hardcoded protocol assumptions.
**Test:** unit · integration · negative cases · resource-envelope under realistic proof sizes.

## Out of scope for zkNemo
RISC Zero verifier, UltraHonk/Noir, raw CAP specs — different stacks (see filtered resources ⚪ SKIP). BLS12-381 is supported on Stellar but the PoC uses BN254/Groth16, so not in our path.

## Related
- `client-side-groth16-proofs`, `stellar-private-payments-poc`
