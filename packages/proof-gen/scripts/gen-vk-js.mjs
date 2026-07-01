import { UltraHonkBackend } from "@aztec/bb.js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..", "..", "..");
const CIRCUITS_DIR = join(ROOT, "web", "public", "circuits");
const circuits = ["open_position", "liquidate", "repay_withdraw", "claim_payment"];

for (const name of circuits) {
  console.log(`  Generating VK for ${name}...`);
  const artifactPath = join(CIRCUITS_DIR, `${name}.json`);
  const circuit = JSON.parse(readFileSync(artifactPath, "utf-8"));

  const backend = new UltraHonkBackend(circuit.bytecode);
  await backend.instantiate();
  const jsVk = await backend.getVerificationKey({ keccak: true });
  await backend.destroy();

  const outPath = join(CIRCUITS_DIR, `${name}.vk.bin`);
  writeFileSync(outPath, Buffer.from(jsVk));
  console.log(`    ${outPath} (${Buffer.from(jsVk).length} bytes)`);
}
console.log("\nDone! 4 VKs generated.");
