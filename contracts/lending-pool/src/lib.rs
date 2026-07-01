#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    vec, Address, BytesN, Env, IntoVal, Symbol, Val, token,
};
use eclipse_shared::{EclipseError, Position, ProofBytes, LEDGER_THRESHOLD, LEDGER_EXTEND};

#[contracttype]
pub enum PoolKey {
    Admin,
    Verifier,
    Oracle,
    CreditIssuer,
    UsdcToken,
    Position(BytesN<32>),
    Nullifier(BytesN<32>),
    LiqThresholdBps,
}

#[contract]
pub struct LendingPoolContract;

#[contractimpl]
impl LendingPoolContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        verifier: Address,
        oracle: Address,
        credit_issuer: Address,
        usdc_token: Address,
        liq_threshold_bps: u64,
    ) {
        if env.storage().instance().has(&PoolKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&PoolKey::Admin, &admin);
        env.storage().instance().set(&PoolKey::Verifier, &verifier);
        env.storage().instance().set(&PoolKey::Oracle, &oracle);
        env.storage().instance().set(&PoolKey::CreditIssuer, &credit_issuer);
        env.storage().instance().set(&PoolKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&PoolKey::LiqThresholdBps, &liq_threshold_bps);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_EXTEND);
    }

    /// Open a confidential lending position.
    /// Requires a valid ZK proof from the open_position circuit.
    pub fn open_position(
        env: Env,
        borrower: Address,
        collateral_asset: Address,
        collateral_commitment: BytesN<32>,
        debt_commitment: BytesN<32>,
        credit_attestation: BytesN<32>,
        nullifier_hash: BytesN<32>,
        collateral_amount: i128,
        debt_amount: i128,
        proof: ProofBytes,
    ) {
        borrower.require_auth();

        // Anti-replay: nullifier must be fresh
        if env.storage().persistent().has(&PoolKey::Nullifier(nullifier_hash.clone())) {
            panic!("{}", EclipseError::NullifierAlreadyUsed as u32);
        }

        // Verify ZK proof (circuit 0 = open_position)
        if !Self::verify_proof(&env, 0, proof) {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        // Pull collateral from borrower
        token::Client::new(&env, &collateral_asset).transfer(
            &borrower,
            &env.current_contract_address(),
            &collateral_amount,
        );

        // Push USDC to borrower
        let usdc: Address = env.storage().instance().get(&PoolKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc).transfer(
            &env.current_contract_address(),
            &borrower,
            &debt_amount,
        );

        // Store position (commitments only — no sensitive data on-chain)
        let pos = Position {
            collateral_commitment: collateral_commitment.clone(),
            debt_commitment: debt_commitment.clone(),
            credit_attestation,
            nullifier: nullifier_hash.clone(),
            opened_at: env.ledger().sequence(),
            is_active: true,
        };
        env.storage().persistent().set(&PoolKey::Position(nullifier_hash.clone()), &pos);
        env.storage().persistent().set(&PoolKey::Nullifier(nullifier_hash.clone()), &true);

        env.events().publish(
            (symbol_short!("open"), borrower),
            (collateral_commitment, debt_commitment),
        );
    }

    /// Liquidate an unhealthy position.
    /// Requires ZK proof that HF < 1 without revealing actual values.
    pub fn liquidate(
        env: Env,
        liquidator: Address,
        nullifier_hash: BytesN<32>,
        collateral_asset: Address,
        collateral_amount: i128,
        proof: ProofBytes,
    ) {
        liquidator.require_auth();

        let mut pos: Position = env
            .storage()
            .persistent()
            .get(&PoolKey::Position(nullifier_hash.clone()))
            .unwrap_or_else(|| panic!("{}", EclipseError::PositionNotFound as u32));

        if !pos.is_active {
            panic!("{}", EclipseError::PositionNotActive as u32);
        }

        // Verify ZK proof (circuit 1 = liquidate)
        if !Self::verify_proof(&env, 1, proof) {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        pos.is_active = false;
        env.storage().persistent().set(&PoolKey::Position(nullifier_hash.clone()), &pos);

        // Transfer collateral to liquidator
        token::Client::new(&env, &collateral_asset).transfer(
            &env.current_contract_address(),
            &liquidator,
            &collateral_amount,
        );

        env.events().publish((symbol_short!("liq"), liquidator), nullifier_hash);
    }

    /// Repay debt or withdraw collateral, proving position stays healthy.
    pub fn repay_withdraw(
        env: Env,
        borrower: Address,
        nullifier_hash: BytesN<32>,
        collateral_asset: Address,
        new_collateral_commitment: BytesN<32>,
        new_debt_commitment: BytesN<32>,
        delta_collateral: i128,
        delta_debt: i128,
        proof: ProofBytes,
    ) {
        borrower.require_auth();

        let mut pos: Position = env
            .storage()
            .persistent()
            .get(&PoolKey::Position(nullifier_hash.clone()))
            .unwrap_or_else(|| panic!("{}", EclipseError::PositionNotFound as u32));

        if !pos.is_active {
            panic!("{}", EclipseError::PositionNotActive as u32);
        }

        // Verify ZK proof (circuit 2 = repay_withdraw)
        if !Self::verify_proof(&env, 2, proof) {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        // Accept USDC repayment
        if delta_debt > 0 {
            let usdc: Address = env.storage().instance().get(&PoolKey::UsdcToken).unwrap();
            token::Client::new(&env, &usdc).transfer(
                &borrower,
                &env.current_contract_address(),
                &delta_debt,
            );
        }

        // Return collateral
        if delta_collateral > 0 {
            token::Client::new(&env, &collateral_asset).transfer(
                &env.current_contract_address(),
                &borrower,
                &delta_collateral,
            );
        }

        // Update commitments in-place
        pos.collateral_commitment = new_collateral_commitment.clone();
        pos.debt_commitment = new_debt_commitment.clone();
        env.storage().persistent().set(&PoolKey::Position(nullifier_hash), &pos);

        env.events().publish(
            (symbol_short!("repay"), borrower),
            (new_collateral_commitment, new_debt_commitment),
        );
    }

    // -- Views --

    pub fn get_position(env: Env, nullifier_hash: BytesN<32>) -> Position {
        env.storage()
            .persistent()
            .get(&PoolKey::Position(nullifier_hash))
            .unwrap_or_else(|| panic!("{}", EclipseError::PositionNotFound as u32))
    }

    pub fn get_liq_threshold(env: Env) -> u64 {
        env.storage().instance().get(&PoolKey::LiqThresholdBps).unwrap_or(100)
    }

    // -- Internal --

    fn verify_proof(env: &Env, circuit_id: u32, proof: ProofBytes) -> bool {
        let verifier: Address = env.storage().instance().get(&PoolKey::Verifier).unwrap();
        let args: soroban_sdk::Vec<Val> = vec![
            env,
            circuit_id.into_val(env),
            proof.into_val(env),
        ];
        env.invoke_contract(&verifier, &Symbol::new(env, "verify"), args)
    }
}
