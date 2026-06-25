---
name: stellar-frontend-integration
description: Wire the zkNemo Next.js frontend to Stellar — wallet connect (Stellar Wallets Kit / Freighter), stellar-sdk, Soroban RPC, testnet account funding, transaction signing/submission, and cross-origin-isolation headers for WASM proof gen. Use when building the connect/dashboard/submit layers.
---

# Stellar frontend integration (zkNemo)

Connect the browser dApp to Stellar testnet: sign, submit, poll, sync.

## Stack
- Next.js 16.2.9 (App Router), React 19.2.4, Tailwind 4, TS 5.
- `@stellar/stellar-sdk` + Soroban RPC.
- Wallet: **Stellar Wallets Kit** (unified API, Freighter + others) — https://stellarwalletskit.dev/
- ⚠️ Next.js 16 has breaking changes — **read `node_modules/next/dist/docs/` before writing any Next.js code** (per `AGENTS.md`).

## Wallet connect
- Use Stellar Wallets Kit for one connect API instead of hand-wiring Freighter.
- Decide Freighter-only vs. multi-wallet (spec §13 Q3). Kit covers both cheaply.
- Show a **testnet** network badge; refuse mainnet in MVP.

## Transaction lifecycle (per op)
1. Build proof (see `client-side-groth16-proofs`).
2. Assemble Soroban invocation: Pool method + (proof, public inputs).
3. Simulate via RPC to get resource fees / auth.
4. Sign with the connected wallet.
5. Submit; poll `getTransaction` until success/fail.
6. Update local notes + activity log; on transfer, scan commitments for incoming notes.

## Cross-origin isolation (shared with proof-gen skill)
WASM proof gen needs `SharedArrayBuffer` → set in `next.config.ts`:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
Verify `crossOriginIsolated === true`. Self-host or CORP-tag cross-origin assets (RPC responses, circuit `.wasm`/`.zkey`, fonts).

## Testnet tooling
- **Lab** — generate + fund testnet accounts: https://developers.stellar.org/docs/tools/lab
- **Stellar CLI** — deploy/interact with contracts: https://developers.stellar.org/docs/tools/cli
- Use latest SDK for Protocol 26 support.

## Reference skills/docs
- Stellar Dev Skill (RPC, wallets, security): https://github.com/stellar/stellar-dev-skill
- SDKs: https://developers.stellar.org/docs/tools/sdks
- llms.txt digest: https://developers.stellar.org/llms.txt

## Related
- `client-side-groth16-proofs`, `stellar-private-payments-poc`, `stellar-zk-primitives`
