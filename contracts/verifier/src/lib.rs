#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Bytes, Env};
use eclipse_shared::ProofBytes;
use ultrahonk_soroban_verifier::{UltraHonkVerifier, PROOF_BYTES};

#[contracttype]
#[derive(Clone, Copy, PartialEq)]
pub enum CircuitId {
    OpenPosition  = 0,
    Liquidate     = 1,
    RepayWithdraw = 2,
    ClaimPayment  = 3,
}

#[contracttype]
pub enum VkKey {
    Vk(u32),
}

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    pub fn set_vk(env: Env, circuit_id: u32, vk: Bytes) {
        env.storage().persistent().set(&VkKey::Vk(circuit_id), &vk);
    }

    pub fn verify(env: Env, circuit_id: u32, proof: ProofBytes) -> bool {
        if proof.proof.len() as usize != PROOF_BYTES {
            return false;
        }
        let vk_bytes: Bytes = match env.storage().persistent().get(&VkKey::Vk(circuit_id)) {
            Some(vk) => vk,
            None => return false,
        };
        let verifier = match UltraHonkVerifier::new(&env, &vk_bytes) {
            Ok(v) => v,
            Err(_) => return false,
        };
        verifier.verify(&env, &proof.proof, &proof.public_inputs).is_ok()
    }
}
