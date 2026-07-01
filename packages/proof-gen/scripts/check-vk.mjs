import { UltraHonkBackend } from "@aztec/bb.js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..", "..", "..");
const CIRCUITS_DIR = join(ROOT, "web", "public", "circuits");
const circuits = ["open_position", "liquidate", "repay_withdraw", "claim_payment"];

async function main() {
  for (const name of circuits) {
    console.log(`\n=== ${name} ===`);
    
    const artifactPath = join(CIRCUITS_DIR, `${name}.json`);
    const circuit = JSON.parse(readFileSync(artifactPath, "utf-8"));
    
    const backend = new UltraHonkBackend(circuit.bytecode);
    await backend.instantiate();
    const jsVk = await backend.getVerificationKey();
    await backend.destroy();
    
    const jsBuf = Buffer.from(jsVk);
    console.log(`JS VK: ${jsBuf.length} bytes`);
    
    const bbPath = join(CIRCUITS_DIR, `${name}.vk.bin`);
    const bbBuf = readFileSync(bbPath);
    console.log(`bb VK: ${bbBuf.length} bytes`);
    
    if (jsBuf.equals(bbBuf)) {
      console.log("✅ MATCH");
    } else {
      console.log("❌ MISMATCH");
      writeFileSync(join(CIRCUITS_DIR, `${name}.js.vk.bin`), jsBuf);
      console.log(`JS VK saved`);
      console.log(`JS hex (first 40): ${jsBuf.subarray(0, 20).toString("hex")}`);
      console.log(`bb hex (first 40): ${bbBuf.subarray(0, 20).toString("hex")}`);
      console.log(`JS hex (last 40): ${jsBuf.subarray(jsBuf.length-20).toString("hex")}`);
      console.log(`bb hex (last 40): ${bbBuf.subarray(bbBuf.length-20).toString("hex")}`);
    }
  }
}
main().catch(console.error);
