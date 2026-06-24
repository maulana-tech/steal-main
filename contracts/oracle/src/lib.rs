//! Oracle contract — price feed for collateral assets.
//!
//! [HONEST STUB] For MVP, prices are manually set by an admin.
//! In production, integrate with Stellar's price oracle ecosystem or
//! a decentralised oracle network (Pyth, Band, etc.).

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};
use eclipse_shared::EclipseError;

/// Storage keys
#[contracttype]
pub enum OracleKey {
    Admin,
    Price(Symbol),    // asset symbol → price (scaled 1e6, in USD)
    UpdatedAt(Symbol),
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    /// Initialize with admin address.
    pub fn init(env: Env, admin: Address) {
        if env.storage().persistent().has(&OracleKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&OracleKey::Admin, &admin);
    }

    /// Admin sets price for an asset symbol (e.g., "XLM", "BTC").
    /// Price is USD value scaled by 1_000_000 (e.g., 1 XLM = $0.10 → 100_000).
    pub fn set_price(env: Env, asset: Symbol, price_usd_scaled: u64) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&OracleKey::Admin)
            .unwrap();
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&OracleKey::Price(asset.clone()), &price_usd_scaled);
        env.storage()
            .persistent()
            .set(&OracleKey::UpdatedAt(asset.clone()), &env.ledger().sequence());

        env.events().publish(
            (symbol_short!("price_set"), asset),
            price_usd_scaled,
        );
    }

    /// Returns price (scaled 1e6) for an asset. Panics if price not set.
    pub fn get_price(env: Env, asset: Symbol) -> u64 {
        env.storage()
            .persistent()
            .get(&OracleKey::Price(asset))
            .unwrap_or_else(|| panic!("price not set"))
    }

    /// Returns the ledger sequence when price was last updated.
    pub fn last_updated(env: Env, asset: Symbol) -> u32 {
        env.storage()
            .persistent()
            .get(&OracleKey::UpdatedAt(asset))
            .unwrap_or(0)
    }
}
