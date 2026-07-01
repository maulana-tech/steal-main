#!/usr/bin/env node
/**
 * init-contracts.mjs — Initialize Eclipse contracts on Stellar testnet via Node.js
 * Usage: node scripts/init-contracts.mjs
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

// Read contract IDs from .env
const envPath = join(ROOT, ".env");
function loadEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter(l => l.includes("="))
      .map(l => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}
const env = loadEnv(envPath);

const VERIFIER_ID      = env.VERIFIER_ID;
const ORACLE_ID        = env.ORACLE_ID;
const CREDIT_ISSUER_ID = env.CREDIT_ISSUER_ID;
const LENDING_POOL_ID  = env.LENDING_POOL_ID;
const NATIVE_TOKEN_ID  = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const require = createRequire(import.meta.url);
const SDK_CJS = join(
  ROOT, "node_modules", ".pnpm",
  "@stellar+stellar-sdk@16.0.1", "node_modules", "@stellar", "stellar-sdk",
  "lib", "cjs", "index.js"
);
const {
  Keypair, rpc, TransactionBuilder, Networks, Contract, Address, nativeToScVal, BASE_FEE
} = require(SDK_CJS);

const RPC_URL    = "https://rpc.ankr.com/stellar_testnet_soroban";
const PASSPHRASE = Networks.TESTNET;
const server     = new rpc.Server(RPC_URL, { allowHttp: false, headers: { "Content-Type": "application/json" } });

const DEPLOYER_SECRET = process.env.DEPLOYER_SECRET ?? env.DEPLOYER_SECRET;
if (!DEPLOYER_SECRET?.startsWith("S")) throw new Error("DEPLOYER_SECRET not found in env or .env");
const keypair = Keypair.fromSecret(DEPLOYER_SECRET);
const deployerAddrStr = keypair.publicKey();

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
          "initialize",
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
          "initialize",
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
          "initialize",
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

  // 4. Initialize PaymentPool (confidential payment links).
  const PAYMENT_POOL_ID = env.PAYMENT_POOL_ID ?? "";
  if (PAYMENT_POOL_ID) {
    try {
      console.log("\n► Initializing PaymentPool...");
      const account = await server.getAccount(deployerAddrStr);
      const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
        .addOperation(
          new Contract(PAYMENT_POOL_ID).call(
            "initialize",
            new Address(deployerAddrStr).toScVal(),
            new Address(VERIFIER_ID).toScVal(),
            new Address(NATIVE_TOKEN_ID).toScVal()
          )
        )
        .setTimeout(300)
        .build();
      const res = await sendAndWait(await simulate(tx));
      console.log("  PaymentPool initialized! Tx:", res.hash);
    } catch (e) {
      console.log("  PaymentPool initialization skipped or failed:", e.message);
    }
  } else {
    console.log("\n► PaymentPool init skipped (set PAYMENT_POOL_ID to enable).");
  }

  // 5. Register verification keys for all circuits
  const VK_FILES = [
    { file: "open_position.vk.bin",   id: 0 },
    { file: "liquidate.vk.bin",      id: 1 },
    { file: "repay_withdraw.vk.bin", id: 2 },
    { file: "claim_payment.vk.bin",  id: 3 },
  ];
  for (const { file, id } of VK_FILES) {
    try {
      console.log(`\n► Registering VK for circuit ${id} (${file})...`);
      const vkPath = join(ROOT, "web", "public", "circuits", file);
      const vkBytes = require("fs").readFileSync(vkPath);
      const account = await server.getAccount(deployerAddrStr);
      const scValBytes = nativeToScVal(Buffer.from(vkBytes), { type: "bytes" });
      const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
        .addOperation(
          new Contract(VERIFIER_ID).call(
            "set_vk",
            nativeToScVal(id, { type: "u32" }),
            scValBytes
          )
        )
        .setTimeout(300)
        .build();
      const res = await sendAndWait(await simulate(tx));
      console.log(`  VK ${id} registered! Tx:`, res.hash);
    } catch (e) {
      console.log(`  VK ${id} skipped or failed:`, e.message);
    }
  }

  console.log("\n=== Initialization completed! ===");
}

main().catch(console.error);
