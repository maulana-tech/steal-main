# Eclipse — Circuit Specifications

## Common Library (`circuits/common/src/lib.nr`)

| Function | Inputs | Output | Description |
|---|---|---|---|
| `commit` | `(value: Field, salt: Field)` | `Field` | Poseidon2([value, salt]) |
| `ltv_bps` | `(score: u64)` | `u64` | LTV percentage (50/75/120) |
| `health_factor_ok` | `(collateral_usd, debt, liq_bps: u64)` | `bool` | HF ≥ 1 check |
| `verify_credit_attestation` | `(addr, score, nonce, expected: Field)` | `bool` | Poseidon commitment match |
| `nullifier` | `(secret_key, position_id: Field)` | `Field` | Poseidon2([sk, pid]) |

---

## Circuit 1: `open_position`

**Purpose:** Prove that a borrower can open a position with hidden collateral/debt/score.

### Public Inputs
| Name | Type | Description |
|---|---|---|
| `collateral_commitment` | `Field` | Poseidon2(collateral, salt_c) |
| `debt_commitment` | `Field` | Poseidon2(debt, salt_d) |
| `credit_attestation` | `Field` | Poseidon2(addr, score, nonce) from issuer |
| `oracle_price_usd` | `u64` | XLM/USD price, scaled 1e6 |
| `min_credit_threshold` | `u64` | Minimum score to access pool |
| `liq_threshold_bps` | `u64` | Liquidation threshold (100 = 1.0x) |
| `nullifier_hash` | `Field` | Anti-replay nullifier |

### Private Inputs
| Name | Type | Description |
|---|---|---|
| `collateral` | `u64` | Actual collateral amount |
| `salt_c` | `Field` | Salt for collateral commitment |
| `debt` | `u64` | Actual debt amount |
| `salt_d` | `Field` | Salt for debt commitment |
| `credit_score` | `u64` | Actual credit score |
| `borrower_address` | `Field` | Borrower's address as field element |
| `issuer_nonce` | `Field` | Nonce from credit issuer |
| `secret_key` | `Field` | Secret for nullifier derivation |
| `position_id` | `Field` | Unique position identifier |

### Constraints
1. `commit(collateral, salt_c) == collateral_commitment`
2. `commit(debt, salt_d) == debt_commitment`
3. `verify_credit_attestation(addr, score, nonce, credit_attestation)` returns true
4. `credit_score >= min_credit_threshold`
5. `debt <= collateral_value_usd * ltv(credit_score) / 100`
6. `health_factor_ok(collateral_value_usd, debt, liq_threshold_bps)` returns true
7. `nullifier(secret_key, position_id) == nullifier_hash`

---

## Circuit 2: `liquidate`

**Purpose:** Prove that a position's HF < 1 without revealing exact values.

### Public Inputs
| Name | Type | Description |
|---|---|---|
| `collateral_commitment` | `Field` | Must match on-chain |
| `debt_commitment` | `Field` | Must match on-chain |
| `oracle_price_usd` | `u64` | Current price |
| `liq_threshold_bps` | `u64` | Liquidation threshold |
| `position_id` | `Field` | Which position to liquidate |

### Private Inputs
| Name | Type | Description |
|---|---|---|
| `collateral` | `u64` | Actual collateral |
| `salt_c` | `Field` | Salt |
| `debt` | `u64` | Actual debt |
| `salt_d` | `Field` | Salt |

### Constraints
1. Commitments open correctly to private values
2. `collateral_value_usd * 100 < debt * liq_threshold_bps` (HF < 1)

---

## Circuit 3: `repay_withdraw`

**Purpose:** Prove that after repay/withdraw, position remains healthy.

### Public Inputs
Old + new commitments, oracle price, threshold, public deltas (repaid/withdrawn amounts).

### Private Inputs
Old + new plaintext values + salts.

### Constraints
1. Old commitments open correctly
2. New commitments open correctly
3. `new_collateral + delta = old_collateral`
4. `new_debt + delta = old_debt`
5. New position HF ≥ 1

---

## Circuit 4: `solvency` (Stretch)

**Purpose:** Aggregate proof that total pool collateral ≥ total debt.

Simplified non-recursive implementation for MVP. Full version would use Noir recursion to fold N position proofs.
