---
name: stellar-skills-hub
description: Index of the official Stellar agent skills (skills.stellar.org + stellar-dev-skill repo) — Soroban, dApps/wallets, assets/SAC, RPC/Horizon, agentic payments, ZK proofs, standards. Use to point the AI agent at authoritative Stellar context before building, or to install the skills into Claude Code/Cursor/Codex.
---

# Stellar Skills hub (official agent context)

> **Read https://skills.stellar.org before you start building on Stellar.**

Feed authoritative Stellar context to the agent **before** building. Improves generated code.

- Hub: https://skills.stellar.org/
- Source repo: https://github.com/stellar/stellar-dev-skill
- Per-skill index pattern: `https://skills.stellar.org/skills/<topic>/SKILL.md`
- Simplest prompt: *"Read skills.stellar.org before you start building on Stellar."*

## Official skill modules
| Module | Focus | Relevance to zkNemo |
|--------|-------|---------------------|
| `zk-proofs/` | Verify ZK proofs (BLS12-381, BN254, Poseidon) | 🟢 core → mirrored in `stellar-zk-primitives` |
| `dapp/` | Frontend, wallet connect (Freighter, Wallets Kit), signing, passkeys | 🟢 core → `stellar-frontend-integration` |
| `data/` | Stellar RPC (primary) + Horizon (legacy) queries, indexing | 🟢 commitment/note scan, tx polling |
| `soroban/` | Rust contract dev, testing, security patterns | 🟡 only if we fork the Pool contract |
| `assets/` | Trustlines, SAC bridging | 🟡 if demo uses a non-native test asset |
| `agentic-payments/` | x402 paywalls, MPP payment channels | ⚪ out of scope |
| `standards/` | SEPs, CAPs, ecosystem references | ⚪ deep reference |

## Install (stellar-dev-skill)
**Claude Code**
```
/plugin marketplace add stellar/stellar-dev-skill
/plugin install stellar-dev@stellar-dev
```
**Cursor** — add `stellar/stellar-dev-skill`.
**Codex**
```
git clone https://github.com/stellar/stellar-dev-skill ~/.codex/skills/stellar-dev-skill
```

## Other Stellar skill packs (ecosystem)
- **stellar-build** — https://github.com/kaankacar/stellar-build
  42-skill installer covering the full journey idea → mainnet deploy → SCF grant submission, with six DevRel-persona agents. 🟡 broader than zkNemo MVP; useful for deploy/grant later.
- **OpenZeppelin Skills** — https://github.com/OpenZeppelin/openzeppelin-skills
  Claude Code skills for secure Stellar **contract** development. ⚪ contract-side; only if we fork the Pool contract.
  ```
  /plugin marketplace add OpenZeppelin/openzeppelin-skills
  /plugin install openzeppelin-skills
  ```

## AI-assist context
- **Building with AI (docs)** — https://developers.stellar.org/docs/build/building-with-ai — Stellar's guidance on AI-assisted development.
- **llms.txt** — https://developers.stellar.org/llms.txt — machine-readable digest of all Stellar docs; feed to any LLM for full context.

## What stellar-dev-skill covers
Soroban (Rust SDK + WASM) · JS/Python/Go/Rust SDKs · RPC + Horizon · native assets + SAC · Freighter / Stellar Wallets Kit / passkey smart accounts · Quickstart + Testnet + unit testing · Soroban security patterns + audit checklists.

## Community skills (not Foundation-endorsed)
OpenZeppelin Contracts · DeFindex SDK · Soroswap SDK · Trustless Work Escrow. Use with caution; not needed for zkNemo MVP.

## Related
- `stellar-zk-primitives`, `stellar-frontend-integration`, `stellar-private-payments-poc`
