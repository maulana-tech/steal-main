# zkNemo Skills

> **Read https://skills.stellar.org before you start building on Stellar.**
> Feed authoritative Stellar context to the agent first — it dramatically improves the code it writes.

Project-scoped skills for zkNemo (private payments dApp on Stellar). Pair these with the official Stellar skills (`stellar-skills-hub`).

## Index
| Skill | Use for |
|-------|---------|
| `stellar-private-payments-poc` | Integrate the Nethermind Privacy Pools PoC — contracts, note model, ops. **Core.** |
| `client-side-groth16-proofs` | Circom + snarkjs WASM proof gen in the browser; COOP/COEP. |
| `stellar-zk-primitives` | zkNemo application of BN254 / Poseidon / Groth16 verification. |
| `stellar-frontend-integration` | Wallet connect, stellar-sdk, Soroban RPC, testnet, tx lifecycle. |
| `stellar-skills-hub` | Index + install of official Stellar agent skills. |
| `zk-proofs` | Official Stellar zk-proofs skill, vendored verbatim. |
| `dapp` | Official Stellar dapp/frontend skill, vendored verbatim (SDK, wallet, tx build/sign/submit, Soroban invoke). |
| `soroban` | Official Stellar soroban skill, vendored verbatim (Rust contracts, testing, security, patterns). Only if forking PoC contracts. |
| `data` | Official Stellar data skill, vendored verbatim (RPC/Horizon, events, ledger entries, polling). |
| `assets` | Official Stellar assets skill, vendored verbatim (classic assets, trustlines, SAC). Only if demo uses a SAC token. |

## Order of operations
1. Read https://skills.stellar.org (and the relevant `SKILL.md`) before building on Stellar.
2. Read `stellar-private-payments-poc` — everything builds on the PoC.
3. Then the flow-specific skill for the task at hand.
