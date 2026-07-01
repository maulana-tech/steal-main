/**
 * @eclipse/proof-gen
 *
 * Client-side ZK proof generation using Noir + Barretenberg (UltraHonk).
 * All proving happens in the browser via WASM; private inputs never leave
 * the user's device.
 *
 * Usage:
 *   const gen = await ProofGenerator.create();
 *   const { proof, publicInputs } = await gen.proveOpenPosition({ ... });
 */

import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import type { CompiledCircuit } from "@noir-lang/noir_js";

export interface OpenPositionInputs {
  // Public
  collateral_commitment: string;   // hex Field
  debt_commitment: string;
  credit_attestation: string;
  oracle_price_usd: number;
  min_credit_threshold: number;
  liq_threshold_bps: number;
  nullifier_hash: string;
  // Private
  collateral: number;
  salt_c: string;
  debt: number;
  salt_d: string;
  credit_score: number;
  borrower_address: string;
  issuer_nonce: string;
  secret_key: string;
  position_id: string;
}

export interface LiquidateInputs {
  // Public
  collateral_commitment: string;
  debt_commitment: string;
  oracle_price_usd: number;
  liq_threshold_bps: number;
  position_id: string;
  // Private
  collateral: number;
  salt_c: string;
  debt: number;
  salt_d: string;
}

export interface RepayWithdrawInputs {
  // Public
  old_collateral_commitment: string;
  old_debt_commitment: string;
  new_collateral_commitment: string;
  new_debt_commitment: string;
  oracle_price_usd: number;
  liq_threshold_bps: number;
  delta_collateral_pub: number;
  delta_debt_pub: number;
  // Private
  old_collateral: number;
  salt_c_old: string;
  old_debt: number;
  salt_d_old: string;
  new_collateral: number;
  salt_c_new: string;
  new_debt: number;
  salt_d_new: string;
}

export interface ClaimPaymentInputs {
  commitment: string;
  borrower: string;
  secret_key: string;
  position_id: string;
}

export interface GeneratedProof {
  proof: Uint8Array;
  publicInputs: string[];
}

export class ProofGenerator {
  private openPositionNoir: Noir;
  private openPositionBackend: UltraHonkBackend;

  private liquidateNoir: Noir;
  private liquidateBackend: UltraHonkBackend;

  private repayWithdrawNoir: Noir;
  private repayWithdrawBackend: UltraHonkBackend;

  private claimPaymentNoir: Noir;
  private claimPaymentBackend: UltraHonkBackend;

  private constructor(
    openPositionCircuit: CompiledCircuit,
    liquidateCircuit: CompiledCircuit,
    repayWithdrawCircuit: CompiledCircuit,
    claimPaymentCircuit: CompiledCircuit,
  ) {
    this.openPositionBackend = new UltraHonkBackend(openPositionCircuit.bytecode as unknown as string);
    this.openPositionNoir = new Noir(openPositionCircuit);

    this.liquidateBackend = new UltraHonkBackend(liquidateCircuit.bytecode as unknown as string);
    this.liquidateNoir = new Noir(liquidateCircuit);

    this.repayWithdrawBackend = new UltraHonkBackend(repayWithdrawCircuit.bytecode as unknown as string);
    this.repayWithdrawNoir = new Noir(repayWithdrawCircuit);

    this.claimPaymentBackend = new UltraHonkBackend(claimPaymentCircuit.bytecode as unknown as string);
    this.claimPaymentNoir = new Noir(claimPaymentCircuit);
  }

  /**
   * Loads compiled circuit artifacts from /public/ and initialises the WASM
   * proving backend.
   *
   * Circuits are pre-compiled via `pnpm build:circuits` and placed in web/public/.
   */
  static async create(): Promise<ProofGenerator> {
    const [openPos, liquidate, repayWithdraw, claimPayment] = await Promise.all([
      fetch("/circuits/open_position.json").then((r) => r.json() as Promise<CompiledCircuit>),
      fetch("/circuits/liquidate.json").then((r) => r.json() as Promise<CompiledCircuit>),
      fetch("/circuits/repay_withdraw.json").then((r) => r.json() as Promise<CompiledCircuit>),
      fetch("/circuits/claim_payment.json").then((r) => r.json() as Promise<CompiledCircuit>),
    ]);
    return new ProofGenerator(openPos, liquidate, repayWithdraw, claimPayment);
  }

  async proveOpenPosition(inputs: OpenPositionInputs): Promise<GeneratedProof> {
    const { witness } = await this.openPositionNoir.execute(inputs as any);
    const { proof, publicInputs } = await this.openPositionBackend.generateProof(witness);
    return { proof, publicInputs };
  }

  async proveLiquidate(inputs: LiquidateInputs): Promise<GeneratedProof> {
    const { witness } = await this.liquidateNoir.execute(inputs as any);
    const { proof, publicInputs } = await this.liquidateBackend.generateProof(witness);
    return { proof, publicInputs };
  }

  async proveRepayWithdraw(inputs: RepayWithdrawInputs): Promise<GeneratedProof> {
    const { witness } = await this.repayWithdrawNoir.execute(inputs as any);
    const { proof, publicInputs } = await this.repayWithdrawBackend.generateProof(witness);
    return { proof, publicInputs };
  }

  async proveClaimPayment(inputs: ClaimPaymentInputs): Promise<GeneratedProof> {
    const { witness } = await this.claimPaymentNoir.execute(inputs as any);
    const { proof, publicInputs } = await this.claimPaymentBackend.generateProof(witness);
    return { proof, publicInputs };
  }

  /**
   * Converts proof + public inputs into the format expected by the
   * Soroban LendingPool contract (ProofBytes struct).
   */
  toContractFormat(generated: GeneratedProof): { proof: Buffer; publicInputs: Buffer } {
    const publicInputsFlat = generated.publicInputs.reduce<number[]>((acc, hex) => {
      const bytes = Buffer.from(hex.replace("0x", "").padStart(64, "0"), "hex");
      return acc.concat(Array.from(bytes));
    }, []);
    return {
      proof: Buffer.from(generated.proof),
      publicInputs: Buffer.from(publicInputsFlat),
    };
  }
}
