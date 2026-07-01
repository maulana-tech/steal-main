#![no_std]
use soroban_sdk::{contracttype, Bytes, BytesN};

/// On-chain position — only commitments, no sensitive values.
#[contracttype]
#[derive(Clone)]
pub struct Position {
    pub collateral_commitment: BytesN<32>,
    pub debt_commitment: BytesN<32>,
    pub credit_attestation: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub opened_at: u32,
    pub is_active: bool,
}

/// ZK proof bytes submitted to the verifier.
#[contracttype]
#[derive(Clone)]
pub struct ProofBytes {
    pub proof: Bytes,
    pub public_inputs: Bytes,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq)]
#[repr(u32)]
pub enum EclipseError {
    Unauthorized          = 1,
    InvalidProof          = 2,
    PositionNotFound      = 3,
    PositionAlreadyExists = 4,
    PositionNotActive     = 5,
    NullifierAlreadyUsed  = 6,
    InsufficientLiquidity = 7,
    PaymentNotFound       = 8,
    PaymentAlreadyClaimed = 9,
}
