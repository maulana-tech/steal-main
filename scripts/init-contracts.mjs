#!/usr/bin/env node
/**
 * init-contracts.mjs — Initialize Eclipse contracts on Stellar testnet via Node.js
 * Usage: node scripts/init-contracts.mjs
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
  Keypair, rpc, TransactionBuilder, Networks, Contract, Address, nativeToScVal, BASE_FEE
} = require(SDK_CJS);

const RPC_URL    = "https://soroban-testnet.stellar.org";
const PASSPHRASE = Networks.TESTNET;
const server     = new rpc.Server(RPC_URL, { allowHttp: false });

const DEPLOYER_SECRET = "SCIYRBV6UGM6RCKW7PZIZGXTXTH3ALRHMFZAH52YTITI7YEP3N2H7REQ";
const keypair = Keypair.fromSecret(DEPLOYER_SECRET);
const deployerAddrStr = keypair.publicKey();

// Read contract IDs
const VERIFIER_ID = "CDWIQUJ5VDPMA55R2SGO72VYJFYD4WLHMIADZ7UGATUVQ2DGVDA2EQEY";
const ORACLE_ID = "CDLKV4IOHUZR7RV4Y6DNDGR2KQ5EJ3AJ55EHSSOAWZA4ZDRXQEBESYXK";
const CREDIT_ISSUER_ID = "CAYFRXZXTPVFZIX7QCKFTSOLCCY5OGLQIZ2KHPZR6WBIAWF4KBLBZK2M";
const LENDING_POOL_ID = "CBZDSF7Z5F5QD3YISOERGYW6GRSICGNEACMKL6H2I4CIQHWU7HALRLWX";
const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

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
  console.log("Initializing Eclipse contracts...");

  // 1. Initialize Oracle
  try {
    console.log("\n► Initializing Oracle...");
    const account = await server.getAccount(deployerAddrStr);
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
      .addOperation(
        new Contract(ORACLE_ID).call(
          "init",
          new Address(deployerAddrStr).toScVal()
        )
      )
      .setTimeout(300)
      .build();
    const res = await sendAndWait(await simulate(tx));
    console.log("  Oracle initialized! Tx:", res.hash);
  } catch (e) {
    console.log("  Oracle initialization skipped or failed:", e.message);
  }

  // 2. Initialize CreditIssuer
  try {
    console.log("\n► Initializing CreditIssuer...");
    const account = await server.getAccount(deployerAddrStr);
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
      .addOperation(
        new Contract(CREDIT_ISSUER_ID).call(
          "init",
          new Address(deployerAddrStr).toScVal()
        )
      )
      .setTimeout(300)
      .build();
    const res = await sendAndWait(await simulate(tx));
    console.log("  CreditIssuer initialized! Tx:", res.hash);
  } catch (e) {
    console.log("  CreditIssuer initialization skipped or failed:", e.message);
  }

  // 3. Initialize LendingPool
  try {
    console.log("\n► Initializing LendingPool...");
    const account = await server.getAccount(deployerAddrStr);
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
      .addOperation(
        new Contract(LENDING_POOL_ID).call(
          "init",
          new Address(deployerAddrStr).toScVal(),
          new Address(VERIFIER_ID).toScVal(),
          new Address(ORACLE_ID).toScVal(),
          new Address(CREDIT_ISSUER_ID).toScVal(),
          new Address(NATIVE_TOKEN_ID).toScVal(),
          nativeToScVal(100n, { type: "u64" })
        )
      )
      .setTimeout(300)
      .build();
    const res = await sendAndWait(await simulate(tx));
    console.log("  LendingPool initialized! Tx:", res.hash);
  } catch (e) {
    console.log("  LendingPool initialization skipped or failed:", e.message);
  }

  console.log("\n=== Initialization completed! ===");
}

main().catch(console.error);
