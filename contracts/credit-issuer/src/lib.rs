#![no_std]
use eclipse_shared::{LEDGER_THRESHOLD, LEDGER_EXTEND};
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
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&IssuerKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&IssuerKey::Admin, &admin);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_EXTEND);
    }

    pub fn issue(env: Env, borrower_key: BytesN<32>, commitment: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&IssuerKey::Admin).unwrap();
        admin.require_auth();
        env.storage().persistent().set(&IssuerKey::Attestation(borrower_key.clone()), &commitment);
        env.events().publish((symbol_short!("attest"),), borrower_key);
    }

    pub fn get_attestation(env: Env, borrower_key: BytesN<32>) -> BytesN<32> {
        env.storage().persistent().get(&IssuerKey::Attestation(borrower_key))
            .unwrap_or_else(|| BytesN::from_array(&env, &[0u8; 32]))
    }

    pub fn revoke(env: Env, borrower_key: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&IssuerKey::Admin).unwrap();
        admin.require_auth();
        env.storage().persistent().remove(&IssuerKey::Attestation(borrower_key));
    }
}
