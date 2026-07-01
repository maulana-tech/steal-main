# Phase 3 — Real UltraHonk Verification (migration guide)

> **Status:** ready-to-apply guide. Nothing here is applied to the working tree —
> the repo still builds/deploys with the STUB verifier. Execute these steps on a
> machine that has the full toolchain (`nargo`, `bb`, `stellar` CLI, `cargo` +
> `wasm32` target). See the [Prerequisites](#0-prerequisites) checklist.
>
> **Goal:** replace the sanity-check STUB in `contracts/verifier/src/lib.rs` with
> real on-chain verification via [`ultrahonk_rust_verifier`](https://github.com/yugocabrio/ultrahonk-rust-verifier)
> (Arkworks BN254, `no_std`), as used by
> [`indextree/ultrahonk_soroban_contract`](https://github.com/indextree/ultrahonk_soroban_contract).

## Why this is a cascading change

Real verification is not a one-file edit. The on-chain verifier only accepts
proofs/VKs in the **bb v0.87.0** format, but this repo is pinned to **Noir/bb
0.36.0**. So four things move together:

| Component | Now | Target |
|---|---|---|
| `soroban-sdk` (all contracts) | `22.0.8` (crates.io) | git rev `acffbbd45be6a0a551146eebfc268d6f95078246` |
| `nargo` (Noir) | `0.36.0` | `1.0.0-beta.9` |
| `bb` (Barretenberg) | `0.36.0` | `0.87.0` |
| JS proving (`@noir-lang/*`, bb.js) | `0.36.0` | match bb `0.87.0` |
| Verifier body | STUB (sanity check) | `ultrahonk_rust_verifier` |
| VK format | `UltraHonkBackend.getVerificationKey()` raw bytes | `bb write_vk` JSON (27 G1 pts / 108 field elems) |
| Proof format | bb 0.36 | 456-field (bb 0.87+); public inputs passed separately |

⚠️ **Load-bearing coupling** (see root `CLAUDE.md`): `scripts/gen-vk.mjs` and the
deploy Node scripts hardcode `node_modules/.pnpm/...@0.36.0/...`. Bumping
`@noir-lang/*` breaks those paths unless updated. **Circuit Noir version must
match the JS backend, or proofs won't verify.**

---

## 0. Prerequisites

```bash
# Noir + Barretenberg at the versions the verifier expects
noirup --version 1.0.0-beta.9      # installs nargo 1.0.0-beta.9
bbup  --version 0.87.0             # installs bb 0.87.0
nargo --version && bb --version    # confirm

# Rust wasm target + stellar CLI (already needed for any deploy)
rustup target add wasm32-unknown-unknown
stellar --version
```

Recommended: do this on **Linux or in Docker**. `build-circuits.sh` currently
skips `bb write_vk` because of a libunwind crash on macOS — real VK generation
needs `bb write_vk` to run, so a Linux environment avoids that entirely.

---

## 1. Bump `soroban-sdk` across the workspace (6 crates)

The verifier crate pins an unreleased `rs-soroban-sdk` revision; the whole
workspace must use the **same** revision or linking fails.

**Recommended — centralize in the workspace** so it's one edit. In
`contracts/Cargo.toml`:

```toml
[workspace]
members = ["shared", "verifier", "oracle", "credit-issuer", "lending-pool", "payment-pool"]
resolver = "2"

[workspace.dependencies]
soroban-sdk = { git = "https://github.com/stellar/rs-soroban-sdk.git", rev = "acffbbd45be6a0a551146eebfc268d6f95078246", default-features = false, features = ["alloc"] }
```

Then in **each** member `Cargo.toml` (`shared`, `verifier`, `oracle`,
`credit-issuer`, `lending-pool`, `payment-pool`) replace the pinned line with:

```toml
[dependencies]
soroban-sdk = { workspace = true }
# ...existing path deps unchanged (eclipse-shared, etc.)

[dev-dependencies]
soroban-sdk = { git = "https://github.com/stellar/rs-soroban-sdk.git", rev = "acffbbd45be6a0a551146eebfc268d6f95078246", features = ["testutils", "alloc"] }
```

> `default-features = false` matters — the git SDK expects it for `no_std`
> contracts. Keep the `alloc` feature (contracts use `Vec`/`Bytes`).

Then fix any `22 → 26` API breakages. Run `cargo build --workspace
--target wasm32-unknown-unknown --release` and expect edits around:

- `env.storage().persistent()/instance()` — API is stable across 22→26 but
  double-check TTL/`extend_ttl` calls if you add any.
- `token::Client` — unchanged signature for `transfer`.
- `BytesN<32>` / `Bytes` — construction helpers stable; watch `from_array`.
- `env.invoke_contract` / `IntoVal` — stable.
- `contracterror` numbering — the verifier uses `#[contracterror]`; our
  `EclipseError` in `shared` uses `#[contracttype] #[repr(u32)]` — leave as is.

Most of our contracts are simple enough that the 22→26 jump is minor, but the
build is the source of truth — iterate until `cargo build --workspace` is green.

---

## 2. Rewrite the verifier (`contracts/verifier/src/lib.rs`)

Add the dependency to `contracts/verifier/Cargo.toml`:

```toml
[dependencies]
soroban-sdk = { workspace = true }
eclipse-shared = { path = "../shared" }
ultrahonk_rust_verifier = { git = "https://github.com/yugocabrio/ultrahonk-rust-verifier.git", default-features = false }
```

Replace the whole `verify` body. This **keeps our public interface** —
`set_vk(circuit_id, vk)` and `verify(circuit_id, ProofBytes) -> bool` — so
`lending-pool` and `payment-pool` need **no changes** (they still call
`verify(circuit_id, proof)` via `invoke_contract`):

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Bytes, Env};
use eclipse_shared::ProofBytes;
use ultrahonk_rust_verifier::{UltraHonkVerifier, PROOF_BYTES};

#[contracttype]
#[derive(Clone, Copy, PartialEq)]
pub enum CircuitId {
    OpenPosition  = 0,
    Liquidate     = 1,
    RepayWithdraw = 2,
    ClaimPayment  = 3,
}

#[contracttype]
pub enum VkKey {
    Vk(u32),
}

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    /// Store the bb-CLI JSON verification-key bytes for a circuit (once, post-deploy).
    pub fn set_vk(env: Env, circuit_id: u32, vk: Bytes) {
        env.storage().persistent().set(&VkKey::Vk(circuit_id), &vk);
    }

    /// Verify a real UltraHonk proof against the stored VK.
    /// `proof.proof` must be exactly PROOF_BYTES; `proof.public_inputs` is a
    /// concatenation of 32-byte big-endian field elements.
    pub fn verify(env: Env, circuit_id: u32, proof: ProofBytes) -> bool {
        if proof.proof.len() as usize != PROOF_BYTES {
            return false;
        }
        let vk_bytes: Bytes = match env.storage().persistent().get(&VkKey::Vk(circuit_id)) {
            Some(vk) => vk,
            None => return false, // VK must be registered first
        };
        let verifier = match UltraHonkVerifier::new(&env, &vk_bytes) {
            Ok(v) => v,
            Err(_) => return false,
        };
        verifier.verify(&proof.proof, &proof.public_inputs).is_ok()
    }
}
```

Reference API (verbatim from `indextree/ultrahonk_soroban_contract`):

```rust
let verifier = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|_| Error::VkParseError)?;
verifier.verify(&proof_bytes, &public_inputs).map_err(|_| Error::VerificationFailed)?;
```

> If `PROOF_BYTES` differs from what bb.js emits (see §5), adjust how the proof
> is packed rather than editing the constant.

---

## 3. Bump Noir/bb and recompile circuits

With `nargo 1.0.0-beta.9` + `bb 0.87.0` installed, recompile all five circuits
(`open_position`, `liquidate`, `repay_withdraw`, `solvency`, `claim_payment`):

```bash
cd circuits/<name> && nargo compile
```

Expect some Noir 1.0 syntax fixes (0.36 → 1.0-beta is a large jump). Known areas:

- **Poseidon2**: confirm `std::hash::poseidon2::Poseidon2::hash(inputs, len)` still
  matches — the hash module moved/renamed across versions. Update
  `circuits/common/src/lib.nr` (`commit`, `nullifier`, `verify_credit_attestation`)
  and re-run `nargo test`.
- **Entrypoint / `pub` inputs**: `fn main(x: pub Field)` is still valid; check
  return-value handling and any `assert(cond, "msg")` messages.
- **Integer casts** (`as Field`, `as u64`) — stable, but verify overflow
  semantics under the new compiler.

⚠️ **Re-enable the commitment asserts.** For proofs to be *meaningful*, uncomment
the relaxed asserts in `liquidate` / `claim_payment` (and equivalents):

```rust
assert(c_commit == collateral_commitment, "collateral commitment mismatch");
// claim_payment:
assert(computed == commitment, "commitment does not open to secret");
assert(n == nullifier_hash, "nullifier mismatch");
```

This only works once the **client-side Poseidon matches Noir** — see §5.

---

## 4. VK generation → bb-CLI JSON (`bb write_vk`)

The on-chain verifier expects the **JSON VK from the `bb` CLI** (27 G1 points /
108 field elements), *not* the raw `getVerificationKey()` bytes that
`gen-vk.mjs` currently writes.

Un-skip `bb write_vk` in `scripts/build-circuits.sh` (it was commented out for
the macOS libunwind crash — on Linux it works):

```bash
for CIRCUIT in "${CIRCUITS[@]}"; do
  cd "$CIRCUITS_DIR/$CIRCUIT"
  nargo compile
  cp "../target/${CIRCUIT}.json" "$OUT_DIR/${CIRCUIT}.json"
  bb write_vk --scheme ultra_honk -b "../target/${CIRCUIT}.json" -o "$OUT_DIR/${CIRCUIT}.vk"
done
```

Then either (a) retire `scripts/gen-vk.mjs`, or (b) update it to read the
`bb write_vk` JSON output instead of calling `UltraHonkBackend.getVerificationKey()`.
The bytes you pass to `set_vk` must be exactly this JSON VK.

> The `@0.36.0` hardcoded path in `gen-vk.mjs` must change if you keep the JS
> route — but the cleaner path is to rely on the `bb` CLI output directly.

---

## 5. Client-side proving (`packages/proof-gen`, `packages/crypto`)

1. **Bump JS deps** in `web/package.json` (and workspace): `@noir-lang/noir_js`,
   `@noir-lang/backend_barretenberg` (or `@aztec/bb.js`) to versions matching bb
   **0.87.0** / Noir **1.0.0-beta.9**. Update the hardcoded `@0.36.0` path in
   `scripts/gen-vk.mjs` and `scripts/deploy-node.mjs` if still referenced.

2. **Real Poseidon in `packages/crypto`.** Today `poseidon2()` is a *stub*
   (`state * 31337n + ...`) that does **not** match Noir. Real verification needs
   commitments that open inside the circuit, so replace it with a Poseidon2 that
   matches the Noir/bb BN254 parameters — either compute it via `noir_js`
   witness execution (as the crypto file's own comment suggests) or a vetted JS
   Poseidon2. Update `commit`/`nullifier`/payment helpers accordingly, then the
   §3 asserts will hold.

3. **Proof packing.** `ProofGenerator.toContractFormat()` already splits
   `{ proof, publicInputs }`. Confirm against `PROOF_BYTES`:
   - `proof.proof.length === PROOF_BYTES` (bb 0.87 = 456 fields → 456×32 bytes,
     minus any public-input prefix bb strips).
   - `public_inputs` = concatenated 32-byte **big-endian** field elements.
   Some bb versions prepend public inputs to the proof — if so, slice them out so
   `proof` is exactly `PROOF_BYTES` and `public_inputs` is passed separately.

4. Add `claim_payment` to `ProofGenerator` **lazily** (don't add it to the
   `Promise.all` in `create()` until the artifact exists, or existing pages break
   on a 404).

---

## 6. Rebuild, redeploy, register VKs

Bumping `soroban-sdk` changes every contract's wasm, so redeploy all of them:

```bash
pnpm build:circuits     # nargo compile + bb write_vk (needs the new toolchain)
pnpm build:contracts    # wasm for all 6 contracts
pnpm deploy             # stellar CLI → new IDs → .env + web/.env.local
```

After deploy, **register a VK per circuit** on the verifier (the STUB tolerated a
missing VK; the real one does not):

```
verifier.set_vk(0, <open_position.vk bytes>)
verifier.set_vk(1, <liquidate.vk bytes>)
verifier.set_vk(2, <repay_withdraw.vk bytes>)
verifier.set_vk(3, <claim_payment.vk bytes>)
```

Add these calls to `scripts/init-contracts.mjs` (it already wires oracle /
credit-issuer / lending-pool / payment-pool init). Load each `.vk` file and pass
its bytes as a `Bytes` scVal.

---

## 7. Verification checklist

- [ ] `cargo build --workspace --target wasm32-unknown-unknown --release` green.
- [ ] `nargo compile` + `nargo test` pass for all 5 circuits (asserts re-enabled).
- [ ] `bb write_vk` produces a JSON VK for each on-chain circuit.
- [ ] `packages/crypto` Poseidon matches Noir (a commitment computed in JS opens
      inside the circuit — test with `nargo execute`).
- [ ] Generate a real `open_position` proof in the browser → `lending-pool.open_position`
      → tx succeeds; verifier returns **true**.
- [ ] **Negative test:** tamper one proof byte → verifier returns **false** and
      the pool call reverts with `InvalidProof`.
- [ ] Repeat the positive/negative test for `liquidate`, `repay_withdraw`,
      `claim_payment`.
- [ ] Update `docs/DEPLOYMENT.md` with the new contract IDs.

---

## 8. Rollback

Everything above is additive/edit-in-place — nothing is applied yet. To keep an
escape hatch when you do apply it:

```bash
git switch -c phase3-real-verifier   # do the migration on a branch
```

The currently deployed testnet contracts keep running the STUB regardless of
local source, so a failed migration never affects the live demo — just redeploy
the branch when green, or `git switch main` to abandon.

---

## References

- Verifier contract (API model): <https://github.com/indextree/ultrahonk_soroban_contract>
- Verifier crate: <https://github.com/yugocabrio/ultrahonk-rust-verifier>
- Alt reference: <https://github.com/yugocabrio/rs-soroban-ultrahonk>
- API / format details: <https://deepwiki.com/indextree/ultrahonk_soroban_contract/2-ultrahonkverifiercontract>
- Milestone write-up: <https://hackmd.io/@indextree/rJPW3jU6lx>
- Noir + Soroban discussion: <https://github.com/orgs/noir-lang/discussions/8560>
- soroban-sdk rev: `acffbbd45be6a0a551146eebfc268d6f95078246` (matches testnet Protocol 26 / Yardstick)
