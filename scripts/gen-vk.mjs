#!/usr/bin/env node
/**
 * gen-vk.mjs — run from monorepo root:
 *   node scripts/gen-vk.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const PKG_DIR   = join(ROOT, "node_modules", ".pnpm",
                    "@noir-lang+backend_barretenberg@0.36.0",
                    "node_modules", "@noir-lang", "backend_barretenberg");
const CIRCUITS  = join(ROOT, "web", "public", "circuits");

const { UltraHonkBackend } = await import(join(PKG_DIR, "lib", "esm", "index.js"));

const NAMES = ["open_position", "liquidate", "repay_withdraw", "claim_payment"];

for (const name of NAMES) {
  console.log(`\n==> ${name}`);
  const artifact = JSON.parse(readFileSync(join(CIRCUITS, `${name}.json`), "utf8"));
  const backend  = new UltraHonkBackend(artifact);
  const vk       = await backend.getVerificationKey();
  const out      = join(CIRCUITS, `${name}.vk.json`);
  writeFileSync(out, JSON.stringify(Array.from(vk)));
  console.log(`    saved ${vk.length} bytes -> ${out}`);
  await backend.destroy();
}

console.log("\ndone.");
