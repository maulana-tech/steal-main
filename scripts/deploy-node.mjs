#!/usr/bin/env node
/**
 * deploy-node.mjs — Deploy Eclipse contracts to Stellar testnet via Node.js
 * Usage: DEPLOYER_SECRET=S... node scripts/deploy-node.mjs
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // testnet only — never in prod

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");
const WASM  = join(ROOT, "contracts", "target", "wasm32-unknown-unknown", "release");

// Use require() so we get ONE module instance with no ESM caching issues
const require = createRequire(import.meta.url);
const SDK_CJS = join(
  ROOT, "node_modules", ".pnpm",
  "@stellar+stellar-sdk@16.0.1", "node_modules", "@stellar", "stellar-sdk",
  "lib", "cjs", "index.js"
);
const {
  Keypair, rpc, TransactionBuilder, Networks,
  Operation, StrKey, Address,
} = require(SDK_CJS);

const RPC_URL    = "https://soroban-testnet.stellar.org";
const PASSPHRASE = Networks.TESTNET;
const server     = new rpc.Server(RPC_URL, { allowHttp: false });

// ── Deployer key ──────────────────────────────────────────────────────────────
const secret = process.env.DEPLOYER_SECRET;
if (!secret?.startsWith("S")) throw new Error("Set DEPLOYER_SECRET=S...");
const keypair = Keypair.fromSecret(secret);
console.log("Deployer:", keypair.publicKey());

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Deploy one contract ───────────────────────────────────────────────────────
async function deploy(name, wasmFile) {
  console.log(`\n► ${name}`);
  const wasm    = readFileSync(join(WASM, wasmFile));
  const account = await server.getAccount(keypair.publicKey());

  // 1. Upload WASM
  const uploadTx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(300)
    .build();

  const uploadResult = await sendAndWait(await simulate(uploadTx));
  const wasmHash = Buffer.from(uploadResult.returnValue.bytes());
  console.log("  wasm hash:", wasmHash.toString("hex").slice(0, 12) + "…");

  // 2. Instantiate contract
  const account2 = await server.getAccount(keypair.publicKey());
  const deployerAddress = new Address(keypair.publicKey());

  const createTx = new TransactionBuilder(account2, {
    fee: "1000000",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.createCustomContract({
        address: deployerAddress,
        wasmHash,
      })
    )
    .setTimeout(300)
    .build();

  const createResult = await sendAndWait(await simulate(createTx));
  const contractAddress = createResult.returnValue.address();
  const contractId = StrKey.encodeContract(contractAddress.contractId());
  console.log("  contract:", contractId);
  return contractId;
}

// ── Deploy all ────────────────────────────────────────────────────────────────
const ids = {};
try {
  ids.VERIFIER_ID      = await deploy("Verifier",      "eclipse_verifier.wasm");
  ids.ORACLE_ID        = await deploy("Oracle",         "eclipse_oracle.wasm");
  ids.CREDIT_ISSUER_ID = await deploy("CreditIssuer",  "eclipse_credit_issuer.wasm");
  ids.LENDING_POOL_ID  = await deploy("LendingPool",   "eclipse_lending_pool.wasm");
  ids.PAYMENT_POOL_ID  = await deploy("PaymentPool",   "eclipse_payment_pool.wasm");
} catch (e) {
  console.error("\nFailed:", e.message);
  process.exit(1);
}

console.log("\n=== Done ===");
for (const [k, v] of Object.entries(ids)) console.log(`${k}=${v}`);

// Write env files (idempotent: strip any previous contract-ID lines first so
// re-deploys overwrite instead of accumulating duplicate keys)
const envPath = join(ROOT, ".env");
const idKeys = Object.keys(ids);
const kept = (existsSync(envPath) ? readFileSync(envPath, "utf8") : "")
  .split("\n")
  .filter((line) => !idKeys.some((k) => line.startsWith(`${k}=`)))
  .join("\n")
  .replace(/\n+$/, "");
const idBlock = Object.entries(ids).map(([k, v]) => `${k}=${v}`).join("\n");
writeFileSync(envPath, (kept ? kept + "\n" : "") + idBlock + "\n");
writeFileSync(join(ROOT, "web", ".env.local"),
`NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_LENDING_POOL_ID=${ids.LENDING_POOL_ID}
NEXT_PUBLIC_VERIFIER_ID=${ids.VERIFIER_ID}
NEXT_PUBLIC_ORACLE_ID=${ids.ORACLE_ID}
NEXT_PUBLIC_CREDIT_ISSUER_ID=${ids.CREDIT_ISSUER_ID}
NEXT_PUBLIC_PAYMENT_POOL_ID=${ids.PAYMENT_POOL_ID}
NEXT_PUBLIC_USDC_TOKEN=
`);
console.log("Config written → .env + web/.env.local");
