---
name: client-side-groth16-proofs
description: Generate Groth16 zero-knowledge proofs in the browser for zkNemo using Circom-compiled WASM + snarkjs, so secrets never leave the device. Use when implementing deposit/transfer/withdraw proof generation, wiring WASM, or fixing SharedArrayBuffer / cross-origin-isolation issues.
---

# Client-side Groth16 proofs (Circom + WASM)

zkNemo generates proofs **in the browser**; the private witness (note keys, amounts) never leaves the device. The PoC uses Circom circuits + Groth16; mirror it.

## Critical browser constraint — do this in M0
WASM proof gen needs **`SharedArrayBuffer`**, which requires **cross-origin isolation**. Set COOP/COEP headers or proof gen silently breaks.

- Next.js: add response headers in `next.config.ts`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- ⚠️ This Next.js is v16 with breaking changes — **read `node_modules/next/dist/docs/` before writing config** (per `AGENTS.md`).
- Validate with `crossOriginIsolated === true` in the browser console before building flows.
- Any cross-origin asset (RPC, fonts, circuit files) must send CORP/CORS-compatible headers, or self-host them.

## Proof-gen flow
1. Decide source (spec §13 Q2): **reuse PoC's proof-gen bundle** vs. **wire Circom artifacts (`.wasm` + `.zkey`) + snarkjs** ourselves. Prefer reuse for the hackathon.
2. Inputs: build the circuit witness from selected input notes, output notes, public amount, Merkle paths, ASP path.
3. `snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)` → `{ proof, publicSignals }`.
4. Format proof + public signals for the Soroban Verifier ABI (BN254 field encoding — see `stellar-zk-primitives`).
5. Submit via the Pool op.

## UX rules
- Proof gen takes seconds → run in a **Web Worker**, show a progress bar, make it cancelable (spec §9).
- Cache `.wasm` / `.zkey` (they are large) after first load.

## Pitfalls
- Field/endianness mismatch between snarkjs output and the on-chain verifier → encode exactly as the PoC client does.
- Stale Merkle root: refresh the on-chain commitment root right before proving.
- Large `.zkey` blocking the main thread → worker + streaming load.

## Related
- `stellar-private-payments-poc` (note model + ops), `stellar-zk-primitives` (on-chain verify), `stellar-frontend-integration` (headers, RPC).
- ZK Proofs skill: https://skills.stellar.org/skills/zk-proofs/SKILL.md
