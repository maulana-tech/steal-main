use std::hash::poseidon2::Poseidon2;

// -- Commitment --
// commit(value, salt) = Poseidon2([value, salt])
// Matches the Poseidon2 host function available in Stellar Protocol 25+.
pub fn commit(value: Field, salt: Field) -> Field {
    Poseidon2::hash([value, salt], 2)
}

// -- LTV schedule --
// Returns LTV * 100 (integer, basis-point-like) based on credit score tier.
//   score < 500        -> LTV = 50  (50%)
//   500 <= score < 700 -> LTV = 75  (75%)
//   score >= 700       -> LTV = 120 (120%, under-collateralised)
pub fn ltv_bps(score: u64) -> u64 {
    if score >= 700 {
        120
    } else if score >= 500 {
        75
    } else {
        50
    }
}

// -- Health factor check (integer arithmetic, scaled) --
// health_factor_ok returns true when:
//   collateral_value_usd * 100 >= debt_usd * liquidation_threshold_bps
// liquidation_threshold_bps: e.g. 100 means HF threshold = 1.0
pub fn health_factor_ok(
    collateral_value_usd: u64,
    debt_usd: u64,
    liquidation_threshold_bps: u64,
) -> bool {
    let lhs: u64 = collateral_value_usd * 100;
    let rhs: u64 = debt_usd * liquidation_threshold_bps;
    lhs >= rhs
}

// -- Attestation verification --
// Verifies that the issuer signed (borrower_address, credit_score) using:
//   expected_commitment = Poseidon2([borrower_address, credit_score, issuer_nonce])
// STUB: for MVP we check that the commitment matches the publicly known issuer sig.
pub fn verify_credit_attestation(
    borrower_address: Field,
    credit_score: u64,
    issuer_nonce: Field,
    expected_commitment: Field,
) -> bool {
    let computed = Poseidon2::hash(
        [borrower_address, credit_score as Field, issuer_nonce],
        3,
    );
    computed == expected_commitment
}

// -- Nullifier --
// Prevents double-borrow / replay. Derived from (secret_key, position_id).
pub fn nullifier(secret_key: Field, position_id: Field) -> Field {
    Poseidon2::hash([secret_key, position_id], 2)
}
