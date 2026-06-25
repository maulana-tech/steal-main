#![no_std]
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
    pub fn init(env: Env, admin: Address) {
        if env.storage().persistent().has(&OracleKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&OracleKey::Admin, &admin);
    }

    /// Set price for an asset (USD scaled 1e6, e.g. $0.10 = 100_000).
    /// [STUB] Manual feed — replace with real oracle integration.
    pub fn set_price(env: Env, asset: Symbol, price: u64) {
        let admin: Address = env.storage().persistent().get(&OracleKey::Admin).unwrap();
        admin.require_auth();
        env.storage().persistent().set(&OracleKey::Price(asset.clone()), &price);
        env.events().publish((symbol_short!("price"), asset), price);
    }

    pub fn get_price(env: Env, asset: Symbol) -> u64 {
        env.storage()
            .persistent()
            .get(&OracleKey::Price(asset))
            .unwrap_or(0)
    }
}
