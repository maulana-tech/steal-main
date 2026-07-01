#![no_std]
//! PaymentPool — confidential payment links on Stellar.
//!
//! A sender locks USDC behind a Poseidon commitment (`lock`). Whoever holds the
//! payment link knows the secret and can prove they can open the commitment,
//! releasing the funds to any recipient (`claim`) without the amount, sender,
//! or receiver ever appearing on the public surface — only the commitment is
//! emitted, and a nullifier prevents double-claims.
//!
//! Mirrors the lending-pool: commitments on-chain, proofs checked via the
//! shared verifier (circuit 3 = claim_payment), token moves via the SEP-41 client.
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, vec, Address, BytesN, Env,
    IntoVal, Symbol, Val,
};
use eclipse_shared::{EclipseError, ProofBytes, LEDGER_THRESHOLD, LEDGER_EXTEND};

/// A locked confidential payment. Only `commitment` is meant to be public;
/// `amount` is stored so the pool can release the exact funds on claim, but it
/// is never returned by a public view nor published in an event.
#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub commitment: BytesN<32>,
    pub amount: i128,
    pub created_at: u32,
    pub is_claimed: bool,
}

#[contracttype]
pub enum PayKey {
    Admin,
    Verifier,
    UsdcToken,
    Payment(BytesN<32>),
    Nullifier(BytesN<32>),
}

/// Circuit id for `claim_payment` (the verifier stores VKs keyed by this u32).
const CLAIM_PAYMENT_CIRCUIT: u32 = 3;

#[contract]
pub struct PaymentPoolContract;

#[contractimpl]
impl PaymentPoolContract {
    pub fn initialize(env: Env, admin: Address, verifier: Address, usdc_token: Address) {
        if env.storage().instance().has(&PayKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&PayKey::Admin, &admin);
        env.storage().instance().set(&PayKey::Verifier, &verifier);
        env.storage().instance().set(&PayKey::UsdcToken, &usdc_token);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_EXTEND);
    }

    /// Lock USDC behind a payment commitment. The sender funds the pool; the
    /// amount stays off the public surface (only the commitment is emitted).
    pub fn lock(env: Env, sender: Address, commitment: BytesN<32>, amount: i128) {
        sender.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }
        if env
            .storage()
            .persistent()
            .has(&PayKey::Payment(commitment.clone()))
        {
            panic!("payment already exists");
        }

        let usdc: Address = env.storage().instance().get(&PayKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc).transfer(
            &sender,
            &env.current_contract_address(),
            &amount,
        );

        let payment = Payment {
            commitment: commitment.clone(),
            amount,
            created_at: env.ledger().sequence(),
            is_claimed: false,
        };
        env.storage()
            .persistent()
            .set(&PayKey::Payment(commitment.clone()), &payment);

        env.events().publish((symbol_short!("lock"), sender), commitment);
    }

    /// Claim a locked payment by proving knowledge of the secret. Requires a
    /// valid `claim_payment` proof; the nullifier blocks double-claims.
    pub fn claim(
        env: Env,
        recipient: Address,
        commitment: BytesN<32>,
        nullifier_hash: BytesN<32>,
        proof: ProofBytes,
    ) {
        recipient.require_auth();

        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&PayKey::Payment(commitment.clone()))
            .unwrap_or_else(|| panic!("{}", EclipseError::PaymentNotFound as u32));

        if payment.is_claimed {
            panic!("{}", EclipseError::PaymentAlreadyClaimed as u32);
        }

        // Anti-replay: nullifier must be fresh.
        if env
            .storage()
            .persistent()
            .has(&PayKey::Nullifier(nullifier_hash.clone()))
        {
            panic!("{}", EclipseError::NullifierAlreadyUsed as u32);
        }

        // Verify the claim_payment ZK proof (circuit 3).
        if !Self::verify_proof(&env, CLAIM_PAYMENT_CIRCUIT, proof) {
            panic!("{}", EclipseError::InvalidProof as u32);
        }

        payment.is_claimed = true;
        env.storage()
            .persistent()
            .set(&PayKey::Payment(commitment.clone()), &payment);
        env.storage()
            .persistent()
            .set(&PayKey::Nullifier(nullifier_hash), &true);

        let usdc: Address = env.storage().instance().get(&PayKey::UsdcToken).unwrap();
        token::Client::new(&env, &usdc).transfer(
            &env.current_contract_address(),
            &recipient,
            &payment.amount,
        );

        env.events().publish((symbol_short!("claim"), recipient), commitment);
    }

    // -- Views --

    /// Whether a payment commitment has already been claimed. Returns false if
    /// the commitment is unknown. Amount is intentionally never exposed here.
    pub fn is_claimed(env: Env, commitment: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&PayKey::Payment(commitment))
            .map(|p: Payment| p.is_claimed)
            .unwrap_or(false)
    }

    /// Whether a payment commitment exists in the pool.
    pub fn exists(env: Env, commitment: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&PayKey::Payment(commitment))
    }

    // -- Internal --

    fn verify_proof(env: &Env, circuit_id: u32, proof: ProofBytes) -> bool {
        let verifier: Address = env.storage().instance().get(&PayKey::Verifier).unwrap();
        let args: soroban_sdk::Vec<Val> =
            vec![env, circuit_id.into_val(env), proof.into_val(env)];
        env.invoke_contract(&verifier, &Symbol::new(env, "verify"), args)
    }
}
