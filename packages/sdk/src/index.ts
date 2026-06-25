/**
 * @eclipse/sdk
 *
 * Thin wrapper around @stellar/stellar-sdk for Eclipse contract interactions.
 * Provides typed functions for all LendingPool, Oracle, and CreditIssuer calls.
 */

import {
  Contract,
  Keypair,
  Networks,
  Operation,
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

import { NETWORK_CONFIG } from "./config";
export { NETWORK_CONFIG } from "./config";

// ── RPC client ───────────────────────────────────────────────────────────────

export function getRpcServer(): SorobanRpc.Server {
  return new SorobanRpc.Server(NETWORK_CONFIG.rpcUrl, { allowHttp: false });
}

// ── Generic contract invoker ──────────────────────────────────────────────────

export async function invokeContract(params: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  source: Keypair;
}): Promise<unknown> {
  const server = getRpcServer();
  const account = await server.getAccount(params.source.publicKey());

  const contract = new Contract(params.contractId);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_CONFIG.networkPassphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(params.source);

  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${sendResult.errorResult}`);
  }

  // Poll for completion
  let getResult;
  do {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  } while (getResult.status === "NOT_FOUND");

  if (getResult.status === "FAILED") {
    throw new Error(`Transaction failed on-chain: ${sendResult.hash}`);
  }

  return sendResult.hash;
}

// ── Oracle helpers ────────────────────────────────────────────────────────────

export async function getOraclePrice(asset: string): Promise<bigint> {
  const server = getRpcServer();
  const contract = new Contract(NETWORK_CONFIG.contracts.oracle);

  // Read-only simulation (no signing needed)
  const result = await server.simulateTransaction(
    new TransactionBuilder(
      await server.getAccount(Keypair.random().publicKey()),
      { fee: BASE_FEE, networkPassphrase: NETWORK_CONFIG.networkPassphrase }
    )
      .addOperation(contract.call("get_price", nativeToScVal(asset, { type: "symbol" })))
      .setTimeout(30)
      .build()
  );

  if (SorobanRpc.Api.isSimulationError(result)) {
    throw new Error(`Oracle read failed: ${result.error}`);
  }

  const val = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return val ? BigInt(scValToNative(val) as number) : 0n;
}

// ── LendingPool helpers ───────────────────────────────────────────────────────

export interface OpenPositionParams {
  borrower: Keypair;
  collateralAsset: string;
  collateralCommitment: Buffer;   // 32 bytes
  debtCommitment: Buffer;         // 32 bytes
  creditAttestation: Buffer;      // 32 bytes
  nullifierHash: Buffer;          // 32 bytes
  collateralAmountPub: bigint;
  debtAmountPub: bigint;
  proofBytes: Buffer;
  publicInputsBytes: Buffer;
}

export async function openPosition(p: OpenPositionParams): Promise<string> {
  const txHash = await invokeContract({
    contractId: NETWORK_CONFIG.contracts.lendingPool,
    method: "open_position",
    args: [
      nativeToScVal(p.borrower.publicKey(), { type: "address" }),
      nativeToScVal(p.collateralAsset, { type: "address" }),
      nativeToScVal(p.collateralCommitment, { type: "bytes" }),
      nativeToScVal(p.debtCommitment, { type: "bytes" }),
      nativeToScVal(p.creditAttestation, { type: "bytes" }),
      nativeToScVal(p.nullifierHash, { type: "bytes" }),
      nativeToScVal(p.collateralAmountPub, { type: "i128" }),
      nativeToScVal(p.debtAmountPub, { type: "i128" }),
      // ProofBytes struct
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: nativeToScVal("proof", { type: "symbol" }),
          val: nativeToScVal(p.proofBytes, { type: "bytes" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("public_inputs", { type: "symbol" }),
          val: nativeToScVal(p.publicInputsBytes, { type: "bytes" }),
        }),
      ]),
    ],
    source: p.borrower,
  });

  return txHash as string;
}

export interface LiquidateParams {
  liquidator: Keypair;
  nullifierHash: Buffer;
  collateralAsset: string;
  collateralAmount: bigint;
  proofBytes: Buffer;
  publicInputsBytes: Buffer;
}

export async function liquidate(p: LiquidateParams): Promise<string> {
  const txHash = await invokeContract({
    contractId: NETWORK_CONFIG.contracts.lendingPool,
    method: "liquidate",
    args: [
      nativeToScVal(p.liquidator.publicKey(), { type: "address" }),
      nativeToScVal(p.nullifierHash, { type: "bytes" }),
      nativeToScVal(p.collateralAsset, { type: "address" }),
      nativeToScVal(p.collateralAmount, { type: "i128" }),
      // ProofBytes struct
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: nativeToScVal("proof", { type: "symbol" }),
          val: nativeToScVal(p.proofBytes, { type: "bytes" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("public_inputs", { type: "symbol" }),
          val: nativeToScVal(p.publicInputsBytes, { type: "bytes" }),
        }),
      ]),
    ],
    source: p.liquidator,
  });

  return txHash as string;
}

export interface RepayWithdrawParams {
  borrower: Keypair;
  nullifierHash: Buffer;
  collateralAsset: string;
  newCollateralCommitment: Buffer;
  newDebtCommitment: Buffer;
  deltaCollateral: bigint;
  deltaDebt: bigint;
  proofBytes: Buffer;
  publicInputsBytes: Buffer;
}

export async function repayWithdraw(p: RepayWithdrawParams): Promise<string> {
  const txHash = await invokeContract({
    contractId: NETWORK_CONFIG.contracts.lendingPool,
    method: "repay_withdraw",
    args: [
      nativeToScVal(p.borrower.publicKey(), { type: "address" }),
      nativeToScVal(p.nullifierHash, { type: "bytes" }),
      nativeToScVal(p.collateralAsset, { type: "address" }),
      nativeToScVal(p.newCollateralCommitment, { type: "bytes" }),
      nativeToScVal(p.newDebtCommitment, { type: "bytes" }),
      nativeToScVal(p.deltaCollateral, { type: "i128" }),
      nativeToScVal(p.deltaDebt, { type: "i128" }),
      // ProofBytes struct
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: nativeToScVal("proof", { type: "symbol" }),
          val: nativeToScVal(p.proofBytes, { type: "bytes" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("public_inputs", { type: "symbol" }),
          val: nativeToScVal(p.publicInputsBytes, { type: "bytes" }),
        }),
      ]),
    ],
    source: p.borrower,
  });

  return txHash as string;
}

export interface Position {
  collateralCommitment: Buffer;
  debtCommitment: Buffer;
  creditAttestation: Buffer;
  nullifier: Buffer;
  openedAt: number;
  isActive: boolean;
}

export async function getPosition(nullifierHash: Buffer): Promise<Position | null> {
  const server = getRpcServer();
  const contract = new Contract(NETWORK_CONFIG.contracts.lendingPool);

  const result = await server.simulateTransaction(
    new TransactionBuilder(
      await server.getAccount(Keypair.random().publicKey()),
      { fee: BASE_FEE, networkPassphrase: NETWORK_CONFIG.networkPassphrase }
    )
      .addOperation(contract.call("get_position", nativeToScVal(nullifierHash, { type: "bytes" })))
      .setTimeout(30)
      .build()
  );

  if (SorobanRpc.Api.isSimulationError(result)) {
    return null;
  }

  const val = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!val) return null;

  const native = scValToNative(val) as any;
  return {
    collateralCommitment: native.collateral_commitment,
    debtCommitment: native.debt_commitment,
    creditAttestation: native.credit_attestation,
    nullifier: native.nullifier,
    openedAt: Number(native.opened_at),
    isActive: Boolean(native.is_active),
  };
}

// ── Type re-exports ───────────────────────────────────────────────────────────
export type { OpenPositionParams as OpenPositionTxParams };

