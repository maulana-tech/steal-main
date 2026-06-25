#!/usr/bin/env node
/**
 * seed-node.mjs — Seed price and credit attestation on Stellar testnet via Node.js
 * Usage: node scripts/seed-node.mjs
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

const require = createRequire(import.meta.url);
const SDK_CJS = join(
  ROOT, "node_modules", ".pnpm",
  "@stellar+stellar-sdk@16.0.1", "node_modules", "@stellar", "stellar-sdk",
  "lib", "cjs", "index.js"
);
const {
  Keypair, rpc, TransactionBuilder, Networks, Contract, Address, nativeToScVal, scValToNative, BASE_FEE
} = require(SDK_CJS);

const RPC_URL    = "https://soroban-testnet.stellar.org";
const PASSPHRASE = Networks.TESTNET;
const server     = new rpc.Server(RPC_URL, { allowHttp: false });

const DEPLOYER_SECRET = "SCIYRBV6UGM6RCKW7PZIZGXTXTH3ALRHMFZAH52YTITI7YEP3N2H7REQ";
const keypair = Keypair.fromSecret(DEPLOYER_SECRET);

const ORACLE_ID = "CDLKV4IOHUZR7RV4Y6DNDGR2KQ5EJ3AJ55EHSSOAWZA4ZDRXQEBESYXK";
const CREDIT_ISSUER_ID = "CAYFRXZXTPVFZIX7QCKFTSOLCCY5OGLQIZ2KHPZR6WBIAWF4KBLBZK2M";

async function simulate(tx) {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error("Sim: " + sim.error);
  return rpc.assembleTransaction(tx, sim).build();
}

async function sendAndWait(tx) {
  tx.sign(keypair);
  const send = await server.sendTransaction(tx);
  if (send.status === "ERROR") throw new Error("Send: " + JSON.stringify(send.errorResult ?? send));
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const result = await server.getTransaction(send.hash);
    if (result.status === "SUCCESS") return result;
    if (result.status === "FAILED")  throw new Error("Tx failed: " + send.hash);
  }
  throw new Error("Tx timeout: " + send.hash);
}

async function main() {
  console.log("Seeding Eclipse demo data via Node.js...");
  const account = await server.getAccount(keypair.publicKey());

  // 1. Set XLM Price to $0.10 (100000)
  console.log("\n► Setting oracle price: XLM = $0.10...");
  const priceTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      new Contract(ORACLE_ID).call(
        "set_price",
        nativeToScVal("XLM", { type: "symbol" }),
        nativeToScVal(100000n, { type: "u64" })
      )
    )
    .setTimeout(300)
    .build();

  const priceResult = await sendAndWait(await simulate(priceTx));
  console.log("  Oracle price set! Tx hash:", priceResult.hash);

  // 2. Issue credit attestation
  const account2 = await server.getAccount(keypair.publicKey());
  const hex32 = "0000000000000000000000000000000000000000000000000000000000000001";
  const bytes32 = Buffer.from(hex32, "hex");

  console.log(`\n► Issuing credit attestation (score=720, commitment=0x${hex32})...`);
  const issueTx = new TransactionBuilder(account2, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      new Contract(CREDIT_ISSUER_ID).call(
        "issue",
        nativeToScVal(bytes32, { type: "bytes" }),
        nativeToScVal(bytes32, { type: "bytes" })
      )
    )
    .setTimeout(300)
    .build();

  const issueResult = await sendAndWait(await simulate(issueTx));
  console.log("  Credit attestation issued! Tx hash:", issueResult.hash);

  console.log("\n=== Seeding completed successfully! ===");
}

main().catch(console.error);
