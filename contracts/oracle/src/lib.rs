#![no_std]
use eclipse_shared::{LEDGER_THRESHOLD, LEDGER_EXTEND};
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contracttype]
pub enum OracleKey {
    Admin,
    Price(Symbol),
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&OracleKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&OracleKey::Admin, &admin);
        env.storage().instance().extend_ttl(LEDGER_THRESHOLD, LEDGER_EXTEND);
    }

    pub fn set_price(env: Env, asset: Symbol, price: u64) {
        let admin: Address = env.storage().instance().get(&OracleKey::Admin).unwrap();
        admin.require_auth();
        env.storage().persistent().set(&OracleKey::Price(asset.clone()), &price);
        env.events().publish((symbol_short!("price"), asset), price);
    }

    pub fn get_price(env: Env, asset: Symbol) -> u64 {
        env.storage().persistent().get(&OracleKey::Price(asset)).unwrap_or(0)
    }
}
