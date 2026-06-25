#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env};

#[contracttype]
pub enum IssuerKey {
    Admin,
    Attestation(BytesN<32>),
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

    /// Issue a credit attestation commitment for a borrower.
    /// commitment = Poseidon2(borrower_address_field, credit_score, nonce)
    /// [STUB] Commitment computed off-chain, submitted by admin.
    pub fn issue(env: Env, borrower_key: BytesN<32>, commitment: BytesN<32>) {
        let admin: Address = env.storage().persistent().get(&IssuerKey::Admin).unwrap();
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&IssuerKey::Attestation(borrower_key.clone()), &commitment);
        env.events().publish((symbol_short!("attest"),), borrower_key);
    }

    pub fn get_attestation(env: Env, borrower_key: BytesN<32>) -> BytesN<32> {
        env.storage()
            .persistent()
            .get(&IssuerKey::Attestation(borrower_key))
            .unwrap_or_else(|| BytesN::from_array(&env, &[0u8; 32]))
    }

    pub fn revoke(env: Env, borrower_key: BytesN<32>) {
        let admin: Address = env.storage().persistent().get(&IssuerKey::Admin).unwrap();
        admin.require_auth();
        env.storage()
            .persistent()
            .remove(&IssuerKey::Attestation(borrower_key));
    }
}
