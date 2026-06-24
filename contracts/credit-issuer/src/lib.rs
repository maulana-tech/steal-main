//! CreditIssuer contract — issues and verifies credit score attestations.
//!
//! [HONEST STUB] For MVP, the issuer manually creates attestations using
//! Poseidon2(borrower_address, credit_score, nonce).
//! In production, integrate with a KYC/credit bureau provider that signs
//! attestations off-chain using a registered keypair.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol,
};

#[contracttype]
pub enum IssuerKey {
    Admin,
    /// Maps borrower address hash → their attestation commitment
    Attestation(BytesN<32>),
    Nonce(BytesN<32>),
}

#[contract]
pub struct CreditIssuerContract;

#[contractimpl]
impl CreditIssuerContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().persistent().has(&IssuerKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&IssuerKey::Admin, &admin);
    }

    /// Admin issues a credit attestation for a borrower.
    ///
    /// commitment = Poseidon2(borrower_address_field, credit_score, nonce)
    /// This matches the circuit's `verify_credit_attestation` check.
    ///
    /// [STUB] In production: compute Poseidon off-chain, submit signed result.
    pub fn issue_attestation(
        env: Env,
        borrower: Address,
        commitment: BytesN<32>,
        nonce: BytesN<32>,
    ) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&IssuerKey::Admin)
            .unwrap();
        admin.require_auth();

        // Derive a stable key from the borrower address
        let borrower_key = env.crypto().sha256(&borrower.to_xdr(&env));

        env.storage()
            .persistent()
            .set(&IssuerKey::Attestation(borrower_key.clone()), &commitment);
        env.storage()
            .persistent()
            .set(&IssuerKey::Nonce(borrower_key), &nonce);

        env.events().publish(
            (symbol_short!("attest"), borrower),
            commitment,
        );
    }

    /// Returns the stored attestation commitment for a borrower.
    pub fn get_attestation(env: Env, borrower: Address) -> BytesN<32> {
        let borrower_key = env.crypto().sha256(&borrower.to_xdr(&env));
        env.storage()
            .persistent()
            .get(&IssuerKey::Attestation(borrower_key))
            .unwrap_or_else(|| panic!("no attestation for borrower"))
    }

    /// Revoke an attestation (e.g., when credit score changes significantly).
    pub fn revoke_attestation(env: Env, borrower: Address) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&IssuerKey::Admin)
            .unwrap();
        admin.require_auth();

        let borrower_key = env.crypto().sha256(&borrower.to_xdr(&env));
        env.storage()
            .persistent()
            .remove(&IssuerKey::Attestation(borrower_key));
    }
}
