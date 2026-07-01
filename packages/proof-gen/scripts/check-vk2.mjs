import { UltraHonkBackend } from "@aztec/bb.js";
import { readFileSync } from "fs";
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
    const jsCore = jsBuf.subarray(0, 1760);
    
    const bbPath = join(CIRCUITS_DIR, `${name}.vk.bin`);
    const bbBuf = readFileSync(bbPath);
    
    if (jsCore.equals(bbBuf)) {
      console.log("✅ VK CONTENT MATCH (first 1760 bytes identical)");
      console.log(`JS total: ${jsBuf.length} bytes, bb: ${bbBuf.length} bytes`);
      console.log(`JS trailing 4: ${jsBuf.subarray(1760).toString("hex")}`);
    } else {
      console.log("❌ VK CONTENT MISMATCH (first 1760 bytes differ)");
    }
  }
}
main().catch(console.error);
