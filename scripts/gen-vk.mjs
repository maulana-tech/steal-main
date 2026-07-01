#!/usr/bin/env node
/**
 * gen-vk.mjs — Read bb write_vk binary output and print hex for deployment.
 * Usage: node scripts/gen-vk.mjs [circuit_name]
 *
 * The VK binary is produced by `bb write_vk` (called from build-circuits.sh).
 * This script reads the .vk.bin file and prints hex suitable for set_vk().
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const CIRCUITS  = join(ROOT, "web", "public", "circuits");

const name = process.argv[2];
const names = name ? [name] : ["open_position", "liquidate", "repay_withdraw", "claim_payment"];

for (const n of names) {
  const path = join(CIRCUITS, `${n}.vk.bin`);
  const buf  = readFileSync(path);
  console.log(`\n${n} (${buf.length} bytes):\n0x${buf.toString("hex")}`);
}
