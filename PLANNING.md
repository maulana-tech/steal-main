# Planning — Eclipse

## UX Issues

### Too-technical terms (should be replaced or explained)

| Term | Lokasi | Masalah |
|---|---|---|
| **UltraHonk** | Badge "ZK Proving Engine (UltraHonk)" di borrower + liquidator | Nama backend proving system — user ga perlu tahu ini. Ganti: "ZK Proof Engine" atau "Privacy Engine" |
| **WASM** | Label "LOADING WASM..." | Implementation detail. Ganti: "Loading…" atau "Initializing…" |
| **Health Factor / HF** | Meter, label "HF 0.83", "Prove HF < 1" | Jargon DeFi. Simpan "Health Factor" sebagai label resmi tapi ganti "Prove HF < 1" → "Prove Position is Unhealthy" |
| **LTV** | "LTV tier: 120%" | Loan-to-Value tidak obvious. Ganti: "Borrow Limit: 120%" |
| **Oracle Price** | Slider label | "Oracle" = blockchain term. Ganti: "XLM/USD Price Feed" |
| **Commitment** | "collateral: 0xdead…" + "Actual amounts hidden on-chain" | Istilah kriptografi. Label saja "Amount (hidden)" dengan tooltip |
| **ZK Proof** | Seluruh app | Wajib dipakai karena inti produk, tapi perlu micro-explanation yang konsisten. Saat ini cuma ada line "Private inputs never leave your device" |

### Yang sudah bagus (jangan diganti)

- **"Borrow in the dark"** — hero hook, kuat
- **"Borrow privately" / "Liquidate blindly" / "Audit with a view key"** — per-role tagline, jelas
- **"LIQUIDATABLE" badge merah** — action-oriented
- **"Proof verified on-chain."** di success state — ringkas, jelas
- **Friendbot faucet** — wallet UX standard

### Saran perbaikan copy

1. **Badge "UltraHonk"** → "Proof Engine" saja
2. **"LOADING WASM..."** → "Initializing proof engine…"
3. **"Prove HF < 1 and Liquidate"** → "Liquidate This Position"
4. **"Mock Position (Walkthrough Only)"** → "Demo Position"
5. **Subtitle "WASM is running. This takes 10–30s."** → "Generating proof in your browser. Your data stays private."
6. **Tooltip LTV** → tambah helper: "Higher credit score → higher borrowing limit"
7. **"ZK Proving Engine"** → "Privacy Engine" (nama produk, bukan teknis)

### Prioritas UX

| Prioritas | Item | Dampak |
|---|---|---|
| P0 | Ganti istilah UltraHonk/WASM dari UI | User confusion langsung |
| P0 | Ganti "Prove HF < 1" jadi Bahasa aksi | Button call-to-action lemah |
| P1 | Tambah micro-explanation untuk ZK di landing | Konversi pemahaman |
| P1 | Ganti "Mock" → "Demo" di badge | Mock terdengar pejoratif |
| P2 | Ganti LTV label jadi user-friendly | Edukasi bertahap |

---

## Technical Roadmap

### Phase 1 — Stabilisasi (sekarang)
- [x] Fix `getPosition` SDK — catch Account not found (DONE)
- [x] Clean up stale localStorage di auditor + liquidator (DONE)
- [ ] Bersihkan duplicate contract IDs di `.env`
- [ ] Update `AGENTS.md` + `CLAUDE.md` seperlunya

### Phase 2 — Real ZK Verification (critical path)
Ini blocking karena verifier STUB = tidak ada security.
- [ ] Bump soroban-sdk 22.0.8 → 26.x di seluruh workspace
  - Butuh: update `contracts/*/Cargo.toml`, sesuaikan API changes
  - Risiko: `BytesN<32>` mungkin jadi `BytesN<32>` (sama) atau berubah
- [ ] Add `ultrahonk-soroban-verifier` sebagai dependency ke `contracts/verifier`
- [ ] Replace `verify()` STUB body dengan real `ultrahonk::verify()`
- [ ] Rebuild WASM, redeploy ke testnet
- [ ] Update `gen-vk.mjs` — pastikan VK format cocok dengan on-chain verifier

### Phase 3 — UX Refresh
- [ ] Replace technical terms di UI (daftar di atas)
- [ ] Tambah explanation tooltip ZK di onboarding flow
- [ ] Testing: user bisa flow lengkap tanpa bantuan dev

### Phase 4 — Interest / Yield

#### Architecture

**Prinsip: interest diverifikasi di circuit, bukan dihitung di contract.**

Karena debt adalah Poseidon commitment, contract tidak punya akses ke nilai debt actual. Solusinya: circuit yang membuktikan bahwa `new_commitment` adalah hasil dari `old_commitment + interest` — tanpa reveal angka ke contract.

```
old_debt ──→ commit(old_debt, old_salt) = old_commitment (on-chain)
                   │
              accrued = old_debt × rate × elapsed_ledgers / 1e18
                   │
            new_debt = old_debt + accrued - repayment
                   │
new_debt ──→ commit(new_debt, new_salt) = new_commitment (on-chain)
                ↑
          circuit proves BOTH commitments
          are correct AND interest formula
          was applied correctly
```

#### Contract changes

Tambahan storage di `lending-pool`:
```
storage:
  interest_rate: u64              // variable, public
  total_deposits: i128            // public
  last_rate_update: u32
  per position:
    last_interest_ledger: u32     // ledger ketika terakhir kali accrual

new functions:
  fn deposit(usdc_amount)         // lenders → pool, earn yield
  fn withdraw(usdc_amount)        // lenders tarik + accrued interest
  fn update_interest_rate()       // auto: utilization = total_debt_est / total_deposits
  fn accrue_interest(proof)       // anyone call, execute circuit interest-only
```

Setiap `deposit`/`withdraw` → `update_interest_rate()`:
```
utilization = total_borrowed_public_estimate / total_deposits
rate = base_rate + utilization × slope
// standard kink model: 0% → base, 80% → kink, 100% → max
```

#### Circuit strategy

**Zero new circuit.** Modifikasi `repay_withdraw` yang sudah ada — tambah constraint interest.

```
Circuit repay_withdraw (modified):

Public inputs:
  old_debt_commitment       │  old_collateral_commitment
  new_debt_commitment         │  new_collateral_commitment
  interest_rate               │  ← dari contract, public
  elapsed_ledgers             │  ← = current_ledger - last_interest_ledger
  oracle_price_usd            │
  liq_threshold_bps           │

Private inputs:
  old_debt, old_salt_d       │  old_collateral, old_salt_c
  new_debt, new_salt_d       │  new_collateral, new_salt_c

Constraints:
  // Existing: commitment verification
  commit(old_debt, old_salt_d)  == old_debt_commitment
  commit(new_debt, new_salt_d)  == new_debt_commitment

  // Interest accrual
  accrued = old_debt × interest_rate × elapsed_ledgers / 1e18
  new_debt == old_debt + accrued - repayment

  // Health factor (modified: check against new_debt)
  HF = (new_collateral × oracle_price_usd) / new_debt ≥ 1
```

**Kenapa modify bukan bikin circuit baru:**
- 1 circuit → 1 verifikasi → lebih murah on-chain
- Repay selalu butuh interest accrual di moment yang sama — tidak pernah ada repay tanpa accrual
- Liquidator atau keeper bisa panggil `accrue_interest(proof)` dengan memasukkan `repayment=0`. Proof dengan `repayment=0` dan `HF >= 1` (posisi sehat). Tapi liquidator bisa panggil dengan data yang sama dan buktikan HF < 1 — ini bedanya.

```
fn accrue_interest(env, nullifier, proof):
  pos = get_position(nullifier)
  rate = get_interest_rate()
  elapsed = env.ledger().sequence() - pos.last_interest_ledger
  verify_proof(env, circuit_id=REPAY_WITHDRAW_MODIFIED, proof)
  pos.last_interest_ledger = env.ledger().sequence()
  update_position(pos)
  // emitted event: interest accrued, no amounts leaked
```

#### Frontend UX

```
Borrower Dashboard
  Interest Rate: 5.2% APR       ← public field dari contract
  Accrued Interest: 12.50 USDC  ← computed locally via decrypt
  Your Total Debt: 762.50 USDC  ← decrypted via view key
  ─────────────────────────────
  Repay: [________] USDC
  [Repay Debt]

Lender View (new page / tab)
  Pool Deposits: 50,000 USDC
  Your Deposit: 1,250 USDC
  Your Yield: 8.42 USDC
  Interest Rate: 5.2% APR
  ─────────────────────────────
  [Deposit]   [Withdraw]
```

**Zero new terminology in UI.** "Interest Rate", "APR", "Deposit", "Withdraw", "Yield" — semua sudah dimengerti orang awam.

#### Kenapa pendekatan ini (bukan opsi lain)

| Opsi | Kelemahan |
|---|---|
| **Accrue di contract langsung** | Contract tidak bisa akses debt karena Poseidon hash. Tidak feasible. |
| **Circuit terpisah (accrue, repay, liquidate)** | 3 circuit → 3× on-chain cost. Satu circuit cukup. |
| **Interest dipublikasi per position** | Rusak privacy — debt bisa di-track via interest payment. |
| **Flat/stable rate** | Lebih sederhana tapi ga market-efficient. Variable rate = standar. |

#### Implementasi konkret (file-by-file)

```
contracts/lending-pool/src/lib.rs
  - Tambah: PoolKey::InterestRate, PoolKey::TotalDeposits, PoolKey::LastRateUpdate
  - Tambah: Position.last_interest_ledger: u32
  - Tambah: fn deposit(), fn withdraw(), fn update_interest_rate()
  - Ubah: fn repay_withdraw → tambah elapsed_ledgers, interest_rate sebagai public input proof
  - Tambah: fn accrue_interest() — verifikasi proof + update ledger

circuits/repay_withdraw/src/main.nr
  - Ubah: public inputs untuk interest
  - Ubah: constraint interest accrual
  - Ubah: constraint health factor pakai new_debt (post-interest)

packages/sdk/src/index.ts
  - Tambah: deposit(), withdraw(), accrueInterest()
  - Ubah: RepayWithdrawParams → tambah interestRate, elapsedLedgers

web/app/borrower/page.tsx
  - Tambah: display "Interest Rate" dari contract
  - Tambah: display "Accrued Interest" computed locally

web/app/lender/                        (new page)
  - page.tsx: deposit USDC, view balance, withdraw
  - Halaman publik — tidak ada ZK di sisi lender
```

### Phase 5 — Real Oracle + CreditIssuer
- [ ] Oracle: integrasi Stellar DEX price atau Pyth network
- [ ] CreditIssuer: ganti mock dengan ECDSA signature verification di circuit

### Phase 6 — Polish
- [ ] Multi-asset collateral
- [ ] Wallet Connect (ganti stub demo)
- [ ] View key storage non-local (IPFS/encrypted blob)

---

## Referensi

- Verifier real: https://github.com/NethermindEth/rs-soroban-ultrahonk
- Butuh soroban-sdk 26.x (kita masih 22.x)
- LTV schedule: ≥700 → 120%, ≥500 → 75%, else 50%
