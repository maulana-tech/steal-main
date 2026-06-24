//! Shared types across all Eclipse Soroban contracts.
#![no_std]

use soroban_sdk::{contracttype, Bytes, BytesN};

/// On-chain representation of a borrower's position.
/// All sensitive values are hidden behind Poseidon commitments.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Position {
    /// Poseidon2(collateral_amount, salt_c) — hides actual collateral
    pub collateral_commitment: BytesN<32>,
    /// Poseidon2(debt_amount, salt_d) — hides actual debt
    pub debt_commitment: BytesN<32>,
    /// Poseidon2(borrower_address, credit_score, issuer_nonce)
    pub credit_attestation: BytesN<32>,
    /// Anti-replay nullifier = Poseidon2(secret_key, position_id)
    pub nullifier: BytesN<32>,
    /// Block/ledger when position was opened
    pub opened_at: u32,
    /// Whether position is active
    pub is_active: bool,
}

/// Proof bytes submitted to the verifier contract.
/// UltraHonk proof format (Noir/Barretenberg).
#[contracttype]
#[derive(Clone)]
pub struct ProofBytes {
    pub proof: Bytes,
    /// Flattened public inputs as 32-byte field elements
    pub public_inputs: Bytes,
}

/// Events emitted by LendingPool (no sensitive data).
#[contracttype]
pub enum EclipseEvent {
    PositionOpened,
    PositionLiquidated,
    PositionRepaid,
    CollateralWithdrawn,
}

/// Error codes shared across contracts.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq)]
#[repr(u32)]
pub enum EclipseError {
    Unauthorized = 1,
    InvalidProof = 2,
    PositionNotFound = 3,
    PositionAlreadyExists = 4,
    PositionNotActive = 5,
    NullifierAlreadyUsed = 6,
    InsufficientPoolLiquidity = 7,
    OraclePriceStale = 8,
}

impl From<EclipseError> for soroban_sdk::Error {
    fn from(e: EclipseError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}
