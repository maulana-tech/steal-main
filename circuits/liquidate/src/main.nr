// Circuit: liquidate
//
// Proves that a target position has Health Factor < 1 at the current oracle
// price, WITHOUT revealing the exact collateral or debt values.
//
// PUBLIC inputs:
//   collateral_commitment  : Field  - must match on-chain stored value
//   debt_commitment        : Field  - must match on-chain stored value
//   oracle_price_usd       : u64    - current oracle price (scaled 1e6)
//   liq_threshold_bps      : u64    - liquidation threshold
//   position_id            : Field  - identifies which position to liquidate
//
// PRIVATE inputs:
//   collateral             : u64
//   salt_c                 : Field
//   debt                   : u64
//   salt_d                 : Field

use common::commit;

fn main(
    // --- public ---
    collateral_commitment: pub Field,
    debt_commitment: pub Field,
    oracle_price_usd: pub u64,
    liq_threshold_bps: pub u64,
    position_id: pub Field,

    // --- private ---
    collateral: u64,
    salt_c: Field,
    debt: u64,
    salt_d: Field,
) {
    // 1. Verify commitments open correctly to the private values
    let c_commit = commit(collateral as Field, salt_c);
    assert(c_commit == collateral_commitment, "collateral commitment mismatch");

    let d_commit = commit(debt as Field, salt_d);
    assert(d_commit == debt_commitment, "debt commitment mismatch");

    // 2. Compute collateral value at current oracle price
    let collateral_value_usd: u64 = (collateral * oracle_price_usd) / 1_000_000;

    // 3. Assert HF < 1 (NOT health_factor_ok)
    //    health_factor_ok: collateral_value_usd * 100 >= debt * liq_threshold_bps
    //    HF < 1           : collateral_value_usd * 100 <  debt * liq_threshold_bps
    let lhs: u64 = collateral_value_usd * 100;
    let rhs: u64 = debt * liq_threshold_bps;
    assert(lhs < rhs, "position is still healthy, cannot liquidate");

    // Suppress unused variable warning
    let _ = position_id;
}
