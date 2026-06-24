# Context — Stellar Hacks: Real-World ZK

> Dokumen konteks proyek untuk hackathon **Stellar Hacks: Real-World ZK**.
> Tujuannya: bisa dibaca manusia DAN di-feed ke AI agent sebagai konteks awal sebelum membangun.
> Mulai instruksi agent: *"Read skills.stellar.org before you start building on Stellar."*

---

## 1. Hackathon — inti yang harus diingat

- **Tema:** apa saja yang memakai **zero-knowledge** dan jalan di **Stellar**.
- **Syarat ZK "load-bearing":** ZK harus jadi bagian nyata cara kerja produk, bukan sekadar disebut di README.
- **Integrasi Stellar:** verifikasi proof di dalam smart contract Soroban (atau integrasi testnet/mainnet nyata).
- **Submission:** (1) repo open-source + README jelas, (2) video demo 2–3 menit, (3) ZK + Stellar terintegrasi nyata.
- **Filosofi juri:** *"We'd rather see an honest work-in-progress than a polished mystery."* → boleh ada mock, asal jujur ditulis.

### Bias juri (dari brief — pakai ini sebagai kompas)
1. **Real-world money** — Stellar = stablecoin, cross-border payment, RWA, institutional settlement. Proyek payments/identity/compliance "especially welcome".
2. **Compliant privacy** — "selective disclosure", "view key", "ASP allow/deny", "auditability" disebut berulang. Ini arah strategis resmi Stellar.
3. **ZK verified on-chain** — benar-benar memverifikasi proof di Soroban.
4. **Selesai & demoable** — eksekusi rapi + demo hidup mengalahkan ambisi setengah jadi.

### Kenapa sekarang (fondasi protokol)
- **Protocol 25 ("X-Ray"):** host function native untuk **BN254** + **Poseidon/Poseidon2** hashing.
- **Protocol 26 ("Yardstick"):** 9 host function BN254 tambahan (MSM, scalar-field arithmetic, curve-membership) → verifikasi proof (termasuk **Noir/UltraHonk**) jauh lebih murah on-chain.
- Plus **BLS12-381** dari protokol sebelumnya.

---

## 2. Keputusan tooling

| Pilihan | Status | Alasan |
|---|---|---|
| **Noir** (Aztec) | ✅ DIPILIH untuk circuit | Mudah dibaca/ditulis (mirip Rust), iterasi cepat; P26 bikin verifikasi UltraHonk murah; verifier siap pakai |
| **Poseidon** (host fn P25) | ✅ untuk commitment/nullifier | Native, murah |
| **UltraHonk verifier** | ✅ fork `rs-soroban-ultrahonk` | Verifikasi proof Noir di Soroban |
| Circom/Groth16 | cadangan | Lebih murah verifikasi tapi lebih low-level; dipakai kalau jalur privacy-pool |
| RISC Zero | tidak dipakai | Lebih cocok untuk verifiable off-chain computation |

**Model privasi:** account-based + **view key** (address publik, angka rahasia, auditor buka via view key) — selaras narasi "selective disclosure" Stellar dan lebih sederhana dari UTXO/shielded notes.

---

## 3. Ide final — 🌑 Eclipse: Confidential Credit on Stellar

> *Nama kerja, bisa diganti.*

**One-liner:** Pasar pinjaman di Stellar di mana **kolateral, utang, dan skor kredit rahasia** — tapi protokol selalu bisa **membuktikan posisi solvent**, likuidator bisa **membuktikan posisi rapuh tanpa melihat angkanya**, dan auditor membuka semua via **view key**.

### Kenapa ini dipilih (kombinasi pola pemenang global + bias Stellar)
| Pola pemenang global (referensi) | Diwujudkan di Eclipse |
|---|---|
| "Prove threshold, hide the number" (ZK Credit Score @ETHGlobal; Proof-of-Solvency @Aztec) | Buktikan `score ≥ T`, `collateral cukup`, `HF ≥ 1` — angka disembunyikan |
| Under-collateralized lending (Railgun, Teller/DECO, Credora) | Skor tinggi → LTV tinggi → pinjam > kolateral |
| Anti-MEV / hidden position (Renegade, Singularity, Penumbra) | Posisi tak terlihat → tak ada liquidation hunting / copy-trading |
| Compliant privacy (Panther; strategi resmi Stellar) | View key untuk auditor + opsi ASP screening |

Insight kunci: pola ini sudah terbukti di Ethereum/Cosmos/Arbitrum tapi **belum ada di Stellar**, dan P25/P26 baru saja membuka primitive-nya. Angle juara = bawa pola terbukti ini ke Stellar **pertama kali**, dibungkus narasi real-world money.

---

## 4. Inti ZK (load-bearing)

**Circuit 1 — `open_position` (Noir):** borrower generate proof client-side bahwa:
1. Commitment kolateral `C_commit = Poseidon(collateral, salt)` benar.
2. Atribut kredit dari **attestation ber-signature issuer**: `credit_score ≥ threshold` (tanpa reveal skor).
3. `requested_debt ≤ collateral × LTV(score)` — LTV naik mengikuti skor.
4. Health factor `≥ 1` pada harga oracle saat ini.

**Circuit 2 — `liquidate` (Noir):** likuidator generate proof bahwa pada harga oracle terbaru, posisi target `HF < 1` — tanpa mengetahui nilai persis (output boolean). → trigger likuidasi adil.

**Selective disclosure:** posisi dienkripsi ke **view key**; auditor dekripsi penuh. Publik tetap buta.

**Client-side:** proof di-generate di browser (WASM) → secret tak pernah keluar device.

---

## 5. Arsitektur

```
Frontend (Next.js + Stellar Wallet Kit)
  ├─ Noir/bb.js WASM → generate proof di browser
  └─ 3 view: Borrower · Liquidator · Auditor
         │ submit proof + commitments
         ▼
Soroban contracts (Rust):
  ├─ LendingPool        → simpan commitment posisi, kelola pool USDC
  ├─ UltraHonkVerifier  → fork rs-soroban-ultrahonk
  ├─ Oracle (mock)      → harga, manual feed         [STUB JUJUR]
  └─ CreditIssuer (mock)→ signer attestation skor     [STUB JUJUR]
Primitives: Poseidon (host fn native P25) untuk commitment/nullifier
Network: Stellar testnet (Protocol 26)
```

---

## 6. Demo flow (30–60 dtk, momen "wow")

1. **Borrower** deposit kolateral & pinjam USDC → explorer hanya tampil commitment, **angka tak terlihat**.
2. "Skor saya tinggi → saya pinjam **120% dari kolateral**, dan kamu tetap tak tahu berapa pun."
3. **Turunkan harga oracle** → posisi jadi unhealthy.
4. **Liquidator** submit **ZK proof `HF < 1`** → likuidasi berhasil **tanpa melihat angka** korban.
5. **Auditor** buka view key → lihat seluruh detail. Publik tetap buta.

→ Menyentuh 3 bias juri dalam satu alur: real-world ✓ compliant-privacy ✓ ZK on-chain ✓.

---

## 7. Scope

**MVP (kejar selesai):**
- Circuit 1 + 2 jalan, verifier terdeploy di testnet.
- 1 aset kolateral, 1 stablecoin pinjaman.
- 3 view frontend, proof client-side, view-key disclosure.
- Oracle & credit issuer = mock.

**Stretch (kalau ada waktu):**
- ASP allow/deny screening (compliant pool).
- Nullifier anti double-borrow.
- Multi-asset.
- Recursive proof agregasi solvensi pool (pamer P26).

**Honest-stub list untuk README:** oracle harga manual, credit issuer mock-signed, model bunga diabaikan di v1, pool single-asset.

---

## 8. Daftar fitur definitif (full scope, tanpa pertimbangan waktu)

### 8.1 Borrower (Peminjam)
1. Connect wallet via Stellar Wallet Kit
2. Deposit kolateral — jumlah disembunyikan sebagai Poseidon commitment on-chain
3. Multi-asset kolateral (beberapa jenis aset)
4. Pinjam stablecoin (USDC) terhadap kolateral
5. Generate ZK proof client-side (browser/WASM) — secret tak pernah keluar device
6. Bukti `credit_score ≥ threshold` tanpa reveal skor → unlock LTV lebih tinggi
7. Under-collateralized borrow (skor tinggi → pinjam > nilai kolateral)
8. Bukti `debt ≤ collateral × LTV` & `health factor ≥ 1`
9. Dashboard posisi privat (hanya borrower lihat angka asli)
10. Repay sebagian / penuh
11. Withdraw kolateral (dengan bukti posisi tetap sehat setelahnya)
12. Tambah kolateral (top-up) untuk perbaiki health factor
13. Akrual bunga / variable interest rate
14. Riwayat transaksi terenkripsi per akun

### 8.2 Liquidator (Likuidator)
15. Lihat daftar posisi — hanya commitment, angka tersembunyi
16. Generate ZK proof `HF < 1` untuk posisi target tanpa tahu angka korban
17. Eksekusi likuidasi → klaim insentif/bonus
18. Partial liquidation (likuidasi sebagian, bukan all-or-nothing)
19. Off-chain watcher / notifikasi posisi mendekati ambang likuidasi

### 8.3 Auditor / Regulator
20. View-key disclosure — buka & rekonstruksi detail posisi penuh
21. Selective disclosure granular (buka posisi tertentu saja, bukan semua)
22. Verifikasi publik tetap buta (explorer hanya tampil commitment)
23. Export laporan audit posisi yang dibuka

### 8.4 Compliance / ASP
24. ASP allow/deny list (Association Set Provider)
25. Bukti non-membership di deny-list saat masuk pool
26. Nullifier — anti double-borrow / anti-replay / Sybil resistance

### 8.5 ZK / Circuit (Noir)
27. Circuit `open_position` (commitment + credit + LTV + HF)
28. Circuit `liquidate` (`HF < 1`)
29. Circuit `repay_withdraw` (posisi tetap sehat pasca-aksi)
30. Poseidon commitment untuk kolateral & utang
31. Verifikasi attestation kredit ber-signature di dalam circuit
32. Recursive proof — agregasi solvensi seluruh pool jadi satu proof

### 8.6 On-chain (Soroban contracts)
33. `LendingPool` contract — simpan commitment posisi, kelola pool USDC
34. `UltraHonkVerifier` contract — verifikasi proof Noir (fork rs-soroban-ultrahonk)
35. `Oracle` contract — feed harga kolateral
36. `CreditIssuer` contract — terbitkan & sign attestation skor
37. Proof-of-Solvency pool — satu ZK proof "total aset ≥ total kewajiban"
38. Event/log on-chain untuk aksi (tanpa bocorkan angka)

### 8.7 Frontend / UX
39. Tiga view terpisah: Borrower · Liquidator · Auditor
40. Toggle "Public view vs Auditor view" — pamer kontras privasi
41. Slider/kontrol harga oracle untuk simulasi (drop harga → trigger likuidasi)
42. Indikator status proof generation (loading/success/error)
43. Deep-link ke Stellar explorer (buktikan angka tak terlihat)
44. Onboarding/tooltip yang menjelaskan peran ZK di tiap langkah
45. Health-factor meter visual per posisi

### 8.8 Infra / dokumentasi
46. Deploy seluruh contract ke Stellar testnet (Protocol 26)
47. Script setup toolchain (Noir, Soroban CLI, fund testnet account)
48. README lengkap + honest-stub list
49. Video demo 2–3 menit

---

## 9. Struktur monorepo

Monorepo dikelola dengan **pnpm workspaces** (TS/JS) + **Cargo workspace** (Rust/Soroban). Noir circuit punya workspace `Nargo.toml` sendiri.

```
eclipse/
├─ circuits/                      # Noir (nargo) — semua ZK circuit
│  ├─ Nargo.toml                  # workspace Noir
│  ├─ common/                     # lib bersama (reusable)
│  │  └─ src/lib.nr               # poseidon commitment, ltv(score), health_factor, verify_attestation
│  ├─ open_position/
│  │  ├─ Nargo.toml
│  │  └─ src/main.nr              # Circuit 1: commitment + credit + LTV + HF >= 1
│  ├─ liquidate/
│  │  ├─ Nargo.toml
│  │  └─ src/main.nr              # Circuit 2: buktikan HF < 1 tanpa reveal angka
│  ├─ repay_withdraw/
│  │  ├─ Nargo.toml
│  │  └─ src/main.nr              # Circuit 3: posisi tetap sehat pasca-aksi
│  └─ solvency/
│     ├─ Nargo.toml
│     └─ src/main.nr              # (stretch) recursive: total aset >= total kewajiban
│
├─ contracts/                     # Soroban (Rust) — Cargo workspace
│  ├─ Cargo.toml                  # [workspace] members = semua contract
│  ├─ Cargo.lock
│  ├─ lending-pool/
│  │  └─ src/lib.rs               # simpan commitment posisi, kelola pool USDC, panggil verifier
│  ├─ verifier/
│  │  └─ src/lib.rs               # UltraHonk verifier (fork rs-soroban-ultrahonk)
│  ├─ oracle/
│  │  └─ src/lib.rs               # feed harga kolateral (mock/manual)   [STUB]
│  ├─ credit-issuer/
│  │  └─ src/lib.rs               # terbitkan & verify attestation skor   [STUB]
│  └─ shared/
│     └─ src/lib.rs               # tipe bersama: Commitment, Position, ProofBytes, events
│
├─ packages/                      # TS shared libs
│  ├─ proof-gen/                  # wrapper bb.js + Noir WASM (generate proof di browser)
│  │  └─ src/index.ts
│  ├─ crypto/                     # poseidon (TS), view-key encrypt/decrypt, salt/nullifier
│  │  └─ src/index.ts
│  └─ sdk/                        # bindings contract + Stellar RPC client + tx builder
│     └─ src/index.ts
│
├─ web/                           # Frontend Next.js (App Router)
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                 # landing + connect wallet
│  │  ├─ borrower/page.tsx        # view Borrower
│  │  ├─ liquidator/page.tsx      # view Liquidator
│  │  └─ auditor/page.tsx         # view Auditor (input view key)
│  ├─ components/
│  │  ├─ WalletConnect.tsx
│  │  ├─ HealthFactorMeter.tsx
│  │  ├─ OraclePriceSlider.tsx    # demo: drop harga -> trigger likuidasi
│  │  ├─ ProofStatus.tsx          # loading/success/error proof
│  │  └─ PublicVsAuditorToggle.tsx
│  ├─ lib/
│  │  ├─ stellar.ts               # init wallet kit, rpc
│  │  └─ config.ts                # alamat contract testnet, network passphrase
│  └─ public/                     # *.wasm circuit + verification key
│
├─ scripts/
│  ├─ setup.sh                    # install nargo, bb, soroban-cli, fund testnet account
│  ├─ build-circuits.sh           # nargo compile + bb write_vk + export wasm ke web/public
│  ├─ gen-verifier.sh             # generate kontrak verifier dari vk
│  ├─ deploy.sh                   # deploy semua contract ke testnet, tulis alamat ke config
│  └─ seed.sh                     # buat attestation kredit demo + posisi contoh
│
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ CIRCUITS.md                 # spesifikasi I/O tiap circuit (public vs private inputs)
│  └─ DEMO.md                     # skrip demo 30–60 dtk
│
├─ context-stellar.md             # dokumen ini
├─ pnpm-workspace.yaml            # packages: ["web", "packages/*"]
├─ package.json                   # script root: dev, build, deploy
├─ .env.example                   # RPC URL, network passphrase, akun deployer
└─ README.md
```

### Catatan struktur
- **3 toolchain terpisah** hidup berdampingan: `nargo`/`bb` (circuits), `cargo`/`soroban` (contracts), `pnpm`/`next` (web + packages). Tidak dicampur dalam satu build tool.
- **Artefak circuit** (`*.wasm`, `*.json` vk) di-build dari `circuits/` lalu di-copy ke `web/public/` agar proof bisa di-generate **client-side**.
- **`packages/sdk`** jadi satu-satunya tempat alamat contract + ABI/bindings → frontend & scripts tinggal import.
- **Alur generate verifier:** `nargo compile` → `bb write_vk` → generate/sesuaikan kontrak `verifier/` → deploy.

---

## 10. Toolchain & dependencies

| Layer | Tool | Versi/catatan |
|---|---|---|
| ZK circuit | **Noir (`nargo`)** | versi terbaru kompatibel UltraHonk |
| Proving backend | **Barretenberg (`bb`)** | generate proof + verification key (UltraHonk) |
| Smart contract | **Rust + `soroban-cli`** | target `wasm32-unknown-unknown`, soroban-sdk ≥ v23 (Protocol 26) |
| Frontend | **Next.js (App Router) + TypeScript** | React 18+ |
| Proof in browser | **`bb.js` + `@noir-lang/noir_js`** | jalankan WASM client-side |
| Wallet | **Stellar Wallets Kit** | koneksi wallet unified |
| Stellar client | **`@stellar/stellar-sdk`** | RPC, tx builder, contract invoke |
| Monorepo | **pnpm workspaces** + **Cargo workspace** | |
| Network | **Stellar testnet** | Protocol 26 ("Yardstick") |
| Primitives | **Poseidon, BN254** | host functions native (P25/P26) |

### Env vars (`.env.example`)
```
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
DEPLOYER_SECRET=S...                 # akun deployer (di-fund via Friendbot/Lab)
LENDING_POOL_ID=                     # diisi setelah deploy
VERIFIER_ID=
ORACLE_ID=
CREDIT_ISSUER_ID=
```

### Root scripts (`package.json`)
- `pnpm setup` → `scripts/setup.sh` (install toolchain + fund akun)
- `pnpm build:circuits` → compile Noir + export WASM/vk ke `web/public`
- `pnpm build:contracts` → `soroban contract build` semua member
- `pnpm deploy` → deploy contract ke testnet, tulis alamat ke `packages/sdk` + `.env`
- `pnpm dev` → jalankan frontend Next.js

---

## 11. Resources kunci

### Start here
- ZK Proofs on Stellar (docs): https://developers.stellar.org/docs/build/apps/zk
- Privacy on Stellar (docs): https://developers.stellar.org/docs/build/apps/privacy
- Stellar Skills (agent-readable): https://skills.stellar.org/
- ZK Proofs skill (direct): https://skills.stellar.org/skills/zk-proofs/SKILL.md

### Tooling & verifier (jalur Noir kita)
- Noir docs: https://noir-lang.org/docs/
- UltraHonk verifier (fork ini): https://github.com/yugocabrio/rs-soroban-ultrahonk
- Alternatif UltraHonk verifier: https://github.com/indextree/ultrahonk_soroban_contract
- Noir on Stellar E2E tutorial: https://jamesbachini.com/noir-on-stellar/

### Referensi privacy/DeFi (untuk contek arsitektur)
- Stellar Private Payments PoC (Circom/Groth16 + ASP): https://github.com/NethermindEth/stellar-private-payments
- Privacy Pools whitepaper: https://privacypools.com/whitepaper.pdf
- Confidential Token Association: https://www.confidentialtoken.org/

### SDK / primitives
- Soroban SDK BN254: https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_bn254/index.html
- Soroban SDK Poseidon: https://docs.rs/soroban-sdk/latest/soroban_sdk/_migrating/v25_poseidon/index.html
- Stellar CLI: https://developers.stellar.org/docs/tools/cli
- Stellar Lab (buat + fund testnet account): https://developers.stellar.org/docs/tools/lab
- Stellar Wallets Kit: https://stellarwalletskit.dev/
- llms.txt (feed ke LLM): https://developers.stellar.org/llms.txt

### Prior art global (pola pemenang yang kita gabung)
- ZK Credit Score (ETHGlobal showcase): https://ethglobal.com/showcase/zk-credit-score-pa7r4
- Aztec hackathon INSPIRATION (ZKollateral, Proof of Liquidity, Private Lending): https://github.com/AztecProtocol/dev-rel/blob/main/hackathons/INSPIRATION.md
- Renegade (dark pool): https://renegade.fi/
- Railgun, Penumbra, Panther, Aztec — confidential DeFi production references
- Chainlink DECO undercollateralized lending PoC: https://blog.chain.link/undercollateralized-lending-teller-deco-poc/

---

## 12. Status & next steps

- [x] Pilih tema: Confidential DeFi (lending)
- [x] Pilih tooling: Noir + UltraHonk + Soroban
- [x] Riset prior art global
- [x] Kunci ide final: Eclipse — Confidential Credit on Stellar
- [ ] Rencana implementasi detail (milestone + urutan kerja + file/contract konkret)
- [ ] Setup repo + toolchain (Noir, Soroban CLI, testnet account)
- [ ] Circuit 1 `open_position`
- [ ] Deploy UltraHonk verifier ke testnet
- [ ] LendingPool contract
- [ ] Circuit 2 `liquidate`
- [ ] Frontend 3 view + client-side proof
- [ ] View-key disclosure
- [ ] Demo video + README