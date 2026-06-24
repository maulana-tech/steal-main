# Eclipse — Demo Script (30–60 seconds)

## Setup
- Contracts deployed to Stellar testnet (Protocol 26)
- Oracle price: $0.10 / XLM
- Demo borrower has credit score 720 (high tier → 120% LTV)
- Frontend running at localhost:3000

---

## Act 1 — Borrow More Than Collateral (~15s)

1. Open `/borrower`, connect demo wallet.
2. Set: 1000 XLM collateral, credit score 720, borrow 750 USDC.
3. Show health factor meter: **1.33 (healthy, green)**.
4. **Key line:** *"My score is 720 → I get 120% LTV. I can borrow MORE than my collateral's dollar value — and you still can't see any of these numbers."*
5. Click "Open Position". Proof generates in browser (~10–30s).
6. Show Stellar explorer: only commitments visible. No amounts. No score.

---

## Act 2 — Price Drop Triggers Liquidation (~15s)

1. Switch to `/liquidator` tab.
2. Show position list: **only hashes/commitments**, amounts hidden.
3. Drag oracle price slider DOWN to $0.07.
4. Health factor for pos_001 flips to **0.93 → RED → "LIQUIDATABLE"**.
5. Click "Generate ZK Proof & Liquidate".
6. **Key line:** *"I just proved this position is underwater without ever seeing the borrower's actual collateral or debt. Zero knowledge."*
7. Liquidation confirmed on-chain.

---

## Act 3 — Auditor Disclosure (~10s)

1. Switch to `/auditor` tab.
2. Show "Public View": only commitments (hashes).
3. Toggle to "Auditor View", enter `vk_demo123`.
4. Full position revealed: 1000 XLM, 750 USDC, score 720.
5. **Key line:** *"Selective disclosure. Auditor sees everything. Public sees nothing. Protocol always solvent."*

---

## What Just Happened

| Action | ZK circuit | Stellar |
|---|---|---|
| Open position | `open_position` proof (7 constraints) | `LendingPool.open_position()` + `VerifierContract.verify()` |
| Liquidation | `liquidate` proof (3 constraints) | `LendingPool.liquidate()` + `VerifierContract.verify()` |
| Auditor view | AES-GCM decrypt with view key | Read on-chain commitments only |

**3 jury biases hit in one flow:**
- ✅ Real-world money (USDC lending, cross-border)
- ✅ Compliant privacy (view key, selective disclosure)
- ✅ ZK verified on-chain (UltraHonk proofs on Soroban P26)
