#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Bytes, Env};
use eclipse_shared::ProofBytes;

#[contracttype]
#[derive(Clone, Copy, PartialEq)]
pub enum CircuitId {
    OpenPosition  = 0,
    Liquidate     = 1,
    RepayWithdraw = 2,
}

#[contracttype]
pub enum VkKey {
    Vk(u32),
}

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    /// Store verification key for a circuit (called once after deploy).
    pub fn set_vk(env: Env, circuit_id: u32, vk: Bytes) {
        env.storage().persistent().set(&VkKey::Vk(circuit_id), &vk);
    }

    /// Verify a UltraHonk proof.
    ///
    /// [STUB] Performs sanity checks only. Replace body with
    /// rs-soroban-ultrahonk call once that crate is available.
    pub fn verify(env: Env, circuit_id: u32, proof: ProofBytes) -> bool {
        // Sanity: VK must be registered
        let _vk: Bytes = env
            .storage()
            .persistent()
            .get(&VkKey::Vk(circuit_id))
            .unwrap_or_else(|| Bytes::new(&env));

        // [STUB] Real: ultrahonk::verify(&env, &_vk, &proof.proof, &proof.public_inputs)
        !proof.proof.is_empty() && proof.public_inputs.len() % 32 == 0
    }
}
