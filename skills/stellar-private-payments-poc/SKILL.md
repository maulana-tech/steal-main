---
name: stellar-private-payments-poc
description: Integrate the Nethermind Stellar Private Payments (Privacy Pools) PoC into zkNemo — pool/verifier/ASP contracts, the UTXO note model, commitments, nullifiers, and the deposit/transfer/withdraw operations. Use when wiring zkNemo to on-chain contracts or modeling notes.
---

# Stellar Private Payments PoC — integration

zkNemo builds **on top of** this PoC. Do not reinvent the cryptography or contracts; reuse them.

- Repo: https://github.com/NethermindEth/stellar-private-payments
- Docs: https://nethermindeth.github.io/stellar-private-payments/
- ⚠️ Research prototype, unaudited, **testnet only, no real assets**.

## Before building
1. Pin a PoC commit. APIs may drift; record the commit hash in zkNemo's README.
2. Read the PoC `/app` (frontend client), `/contracts` (Soroban), `/circuits` (Circom) dirs. Mirror their client code rather than guessing the contract ABI.
3. Confirm whether you **reuse the PoC's deployed testnet contracts** or **redeploy your own** (spec §13 Q1).

## Contracts (already exist)
| Contract | Role |
|----------|------|
| Pool | deposit, transfer, withdraw; nullifier tracking; commitment Merkle root |
| Verifier | on-chain Groth16 proof validation |
| ASP Membership / Non-Membership | allow / block Merkle trees |

## Note model (UTXO, do not change)
- Value held as **private notes** (unspent outputs), not balances.
- **Dual-key per note:** Note Key (BN254) → ownership + commitment; Encryption Key (X25519) → recipient decrypts amount.
- **Commitment** = public hash on-chain in a Merkle tree.
- **Nullifier** = derived from private key; published on spend to stop double-spend; does not link to its commitment.
- Loss of keys/notes = loss of funds → zkNemo must support export/import + local backup.

## The four operations
- **Deposit** — public asset → output notes (splits allowed).
- **Transfer** — spend input notes → recipient output + change output, amounts encrypted to recipients.
- **Withdraw** — spend notes → public payout + change.
- **Transact** — advanced combined op. Out of scope for zkNemo MVP UI.

## Main circuit proves (all at once)
ownership · nullifier correctness · Merkle inclusion of inputs · output commitment correctness · balance conservation (`inputs = outputs + public_amount`) · ASP membership/non-membership.

## zkNemo wiring checklist
- [ ] Locate / deploy Pool, Verifier, ASP contract addresses on testnet → store in config.
- [ ] Reuse PoC note manager + OPFS SQLite scheme for local notes/keys/scan cursor.
- [ ] Per op: build inputs → generate proof (see `client-side-groth16-proofs`) → assemble Soroban tx (proof + public inputs) → sign (Freighter) → submit RPC → poll → update notes + activity.
- [ ] Commitment scan + trial-decrypt to detect incoming notes after a transfer.

## Related
- `client-side-groth16-proofs`, `stellar-zk-primitives`, `stellar-frontend-integration`
- Conceptual basis: Privacy Pools whitepaper — https://privacypools.com/whitepaper.pdf
