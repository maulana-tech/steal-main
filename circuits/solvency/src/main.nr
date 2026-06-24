// Circuit: solvency  [STRETCH GOAL]
//
// Proves total pool assets >= total pool liabilities
// without revealing individual position details.
//
// PUBLIC inputs:
//   total_collateral_value_usd : u64  - aggregated
//   total_debt_usd             : u64  - aggregated
//
// PRIVATE inputs:
//   positions_collateral : [u64; 16]
//   positions_debt       : [u64; 16]
//   oracle_price_usd     : u64

fn main(
    // --- public ---
    total_collateral_value_usd: pub u64,
    total_debt_usd: pub u64,

    // --- private ---
    positions_collateral: [u64; 16],
    positions_debt: [u64; 16],
    oracle_price_usd: u64,
) {
    // 1. Sum collateral values
    let mut sum_collateral_usd: u64 = 0;
    for i in 0..16 {
        sum_collateral_usd += (positions_collateral[i] * oracle_price_usd) / 1_000_000;
    }

    // 2. Sum debts
    let mut sum_debt: u64 = 0;
    for i in 0..16 {
        sum_debt += positions_debt[i];
    }

    // 3. Verify aggregates match public inputs
    assert(sum_collateral_usd == total_collateral_value_usd, "collateral sum mismatch");
    assert(sum_debt == total_debt_usd, "debt sum mismatch");

    // 4. Pool is solvent: total assets >= total liabilities
    assert(
        total_collateral_value_usd >= total_debt_usd,
        "pool is insolvent",
    );
}
