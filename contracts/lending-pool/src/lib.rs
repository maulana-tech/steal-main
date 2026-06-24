//! LendingPool — core Eclipse contract.
//!
//! Stores confidential positions (as commitments), manages the USDC pool,
//! and enforces all actions via ZK proof verification.
//!
//! Privacy model:
//!   - Every position stores only Poseidon commitments on-chain.
//!   - Actual amounts are never on-chain; only borrower (and auditor via
//!     view key) can see them.
//!   - All state-changing actions require a valid UltraHonk proof.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, BytesN, Env, Symbol, token,
};
use eclipse_shared::{EclipseError, Position, ProofBytes};

// ── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum PoolKey {
    Admin,
    VerifierContract,
    OracleContract,
    CreditIssuerContract,
    UsdcToken,
    /// Position keyed by nullifier hash (BytesN<32>)
    Position(BytesN<32>),
    /// Set of used nullifiers (anti-replay)
    Nullifier(BytesN<32>),
    /// Pool parameters
    MinCreditThreshold,
    LiqThresholdBps,
}

// ── Config ────────────────────────────────────────────────────────────────────

pub struct Config {
    pub min_credit_threshold: u64, // e.g. 300
    pub liq_threshold_bps: u64,    // e.g. 100 (= 1.0x)
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct LendingPoolContract;

#[contractimpl]
impl LendingPoolContract {
    // ── Admin setup ──────────────────────────────────────────────────────────

    pub fn init(
        env: Env,
        admin: Address,
        verifier_contract: Address,
        oracle_contract: Address,
        credit_issuer_contract: Address,
        usdc_token: Address,
        min_credit_threshold: u64,
        liq_threshold_bps: u64,
    ) {
        if env.storage().persistent().has(&PoolKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&PoolKey::Admin, &admin);
        env.storage().persistent().set(&PoolKey::VerifierContract, &verifier_contract);
        env.storage().persistent().set(&PoolKey::OracleContract, &oracle_contract);
        env.storage().persistent().set(&PoolKey::CreditIssuerContract, &credit_issuer_contract);
        env.storage().persistent().set(&PoolKey::UsdcToken, &usdc_token);
        env.storage().persistent().set(&PoolKey::MinCreditThreshold, &min_credit_threshold);
        env.storage().persistent().set(&PoolKey::LiqThresholdBps, &liq_threshold_bps);
    }

    // ── Open position ─────────────────────────────────────────────────────────
    //
    // Borrower submits:
    //   1. Collateral transfer (XLM / SAC token) → pool holds it
    //   2. ZK proof of open_position circuit
    //   3. commitments + nullifier (public inputs, match circuit)
    //
    // Contract:
    //   - Verifies proof via VerifierContract
    //   - Checks nullifier not used
    //   - Stores Position on-chain
    //   - Transfers USDC debt amount to borrower
    //
    // [STUB] `debt_amount_pub` is needed to send USDC; in a fully private
    //        design this would be encrypted. For MVP it's a public param.

    pub fn open_position(
        env: Env,
        borrower: Address,
        collateral_asset: Address,
        collateral_commitment: BytesN<32>,
        debt_commitment: BytesN<32>,
        credit_attestation: BytesN<32>,
        nullifier_hash: BytesN<32>,
        collateral_amount_pub: i128,  // actual transfer amount (public for v1)
        debt_amount_pub: i128,        // USDC to send to borrower (public for v1)
        proof: ProofBytes,
    ) {
        borrower.require_auth();

        // 1. Check nullifier hasn't been used
        if env.storage().persistent().has(&PoolKey::Nullifier(nullifier_hash.clone())) {
            panic!("{}", EclipseError::NullifierAlreadyUsed as u32);
        }

        // 2. Verify ZK proof
        let verified = Self::call_verifier(&env, 0u32, proof); // 0 = OpenPosition
        if !verified {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        // 3. Transfer collateral from borrower to pool
        let collateral_client = token::Client::new(&env, &collateral_asset);
        collateral_client.transfer(
            &borrower,
            &env.current_contract_address(),
            &collateral_amount_pub,
        );

        // 4. Send USDC to borrower
        let usdc: Address = env.storage().persistent().get(&PoolKey::UsdcToken).unwrap();
        let usdc_client = token::Client::new(&env, &usdc);
        usdc_client.transfer(
            &env.current_contract_address(),
            &borrower,
            &debt_amount_pub,
        );

        // 5. Store position
        let position = Position {
            collateral_commitment: collateral_commitment.clone(),
            debt_commitment: debt_commitment.clone(),
            credit_attestation: credit_attestation.clone(),
            nullifier: nullifier_hash.clone(),
            opened_at: env.ledger().sequence(),
            is_active: true,
        };
        env.storage()
            .persistent()
            .set(&PoolKey::Position(nullifier_hash.clone()), &position);

        // 6. Mark nullifier used
        env.storage()
            .persistent()
            .set(&PoolKey::Nullifier(nullifier_hash.clone()), &true);

        // 7. Emit event (no sensitive data)
        env.events().publish(
            (symbol_short!("pos_open"), borrower),
            (collateral_commitment, debt_commitment),
        );
    }

    // ── Liquidate ────────────────────────────────────────────────────────────
    //
    // Liquidator submits ZK proof that target position HF < 1.
    // No sensitive data revealed — contract trusts the proof.

    pub fn liquidate(
        env: Env,
        liquidator: Address,
        position_nullifier: BytesN<32>,
        collateral_asset: Address,
        collateral_amount_pub: i128,  // amount returned to liquidator
        proof: ProofBytes,
    ) {
        liquidator.require_auth();

        // 1. Load position
        let mut position: Position = env
            .storage()
            .persistent()
            .get(&PoolKey::Position(position_nullifier.clone()))
            .unwrap_or_else(|| panic!("{}", EclipseError::PositionNotFound as u32));

        if !position.is_active {
            panic!("{}", EclipseError::PositionNotActive as u32);
        }

        // 2. Verify liquidation proof
        let verified = Self::call_verifier(&env, 1u32, proof); // 1 = Liquidate
        if !verified {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        // 3. Mark position inactive
        position.is_active = false;
        env.storage()
            .persistent()
            .set(&PoolKey::Position(position_nullifier.clone()), &position);

        // 4. Transfer collateral to liquidator (with discount handled off-chain)
        let collateral_client = token::Client::new(&env, &collateral_asset);
        collateral_client.transfer(
            &env.current_contract_address(),
            &liquidator,
            &collateral_amount_pub,
        );

        env.events().publish(
            (symbol_short!("liquidate"), liquidator),
            position_nullifier,
        );
    }

    // ── Repay & Withdraw ──────────────────────────────────────────────────────
    //
    // Borrower repays debt and/or withdraws collateral.
    // ZK proof ensures resulting position remains healthy.

    pub fn repay_withdraw(
        env: Env,
        borrower: Address,
        position_nullifier: BytesN<32>,
        collateral_asset: Address,
        new_collateral_commitment: BytesN<32>,
        new_debt_commitment: BytesN<32>,
        delta_collateral_pub: i128,   // collateral to return to borrower
        delta_debt_pub: i128,         // USDC repaid by borrower
        proof: ProofBytes,
    ) {
        borrower.require_auth();

        // 1. Load position
        let mut position: Position = env
            .storage()
            .persistent()
            .get(&PoolKey::Position(position_nullifier.clone()))
            .unwrap_or_else(|| panic!("{}", EclipseError::PositionNotFound as u32));

        if !position.is_active {
            panic!("{}", EclipseError::PositionNotActive as u32);
        }

        // 2. Verify proof
        let verified = Self::call_verifier(&env, 2u32, proof); // 2 = RepayWithdraw
        if !verified {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        // 3. Accept USDC repayment
        if delta_debt_pub > 0 {
            let usdc: Address = env.storage().persistent().get(&PoolKey::UsdcToken).unwrap();
            let usdc_client = token::Client::new(&env, &usdc);
            usdc_client.transfer(
                &borrower,
                &env.current_contract_address(),
                &delta_debt_pub,
            );
        }

        // 4. Return collateral
        if delta_collateral_pub > 0 {
            let collateral_client = token::Client::new(&env, &collateral_asset);
            collateral_client.transfer(
                &env.current_contract_address(),
                &borrower,
                &delta_collateral_pub,
            );
        }

        // 5. Update commitments
        position.collateral_commitment = new_collateral_commitment.clone();
        position.debt_commitment = new_debt_commitment.clone();
        env.storage()
            .persistent()
            .set(&PoolKey::Position(position_nullifier.clone()), &position);

        env.events().publish(
            (symbol_short!("repay"), borrower),
            (new_collateral_commitment, new_debt_commitment),
        );
    }

    // ── View helpers ─────────────────────────────────────────────────────────

    /// Returns the on-chain position (commitments only, no sensitive data).
    pub fn get_position(env: Env, nullifier_hash: BytesN<32>) -> Position {
        env.storage()
            .persistent()
            .get(&PoolKey::Position(nullifier_hash))
            .unwrap_or_else(|| panic!("{}", EclipseError::PositionNotFound as u32))
    }

    pub fn get_liq_threshold(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&PoolKey::LiqThresholdBps)
            .unwrap_or(100)
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    fn call_verifier(env: &Env, circuit_id: u32, proof: ProofBytes) -> bool {
        let verifier: Address = env
            .storage()
            .persistent()
            .get(&PoolKey::VerifierContract)
            .unwrap();

        // Cross-contract call to VerifierContract::verify(circuit_id, proof)
        env.invoke_contract(
            &verifier,
            &Symbol::new(env, "verify"),
            soroban_sdk::vec![
                env,
                circuit_id.into_val(env),
                proof.into_val(env),
            ],
        )
    }
}
