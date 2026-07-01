import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..", "..", "..");
const CIRCUITS_DIR = join(ROOT, "web", "public", "circuits");

async function generateProof(name, inputs) {
  const artifactPath = join(CIRCUITS_DIR, `${name}.json`);
  const circuit = JSON.parse(readFileSync(artifactPath, "utf-8"));
  
  console.log(`  Initializing Noir+BB for ${name}...`);
  const backend = new UltraHonkBackend(circuit.bytecode);
  await backend.instantiate();
  const noir = new Noir(circuit);
  
  console.log("  Executing circuit...");
  const { witness } = await noir.execute(inputs);
  
  console.log("  Generating proof...");
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
  
  await backend.destroy();
  return { proof, publicInputs };
}

function toContractFormat(generated) {
  const publicInputsFlat = generated.publicInputs.reduce((acc, hex) => {
    const bytes = Buffer.from(hex.replace("0x", "").padStart(64, "0"), "hex");
    return Buffer.concat([acc, bytes]);
  }, Buffer.alloc(0));
  return {
    proof: Buffer.from(generated.proof),
    publicInputs: publicInputsFlat,
  };
}

// Small valid BN254 field elements
const f = (n) => "0x" + n.toString(16).padStart(64, "0");

const inputs = {
  collateral_commitment: f(1),
  debt_commitment:       f(2),
  credit_attestation:    f(3),
  oracle_price_usd:      100000,
  min_credit_threshold:  500,
  liq_threshold_bps:     100,
  nullifier_hash:        f(4),
  collateral:            100000,
  salt_c:                f(10),
  debt:                  5000,
  salt_d:                f(11),
  credit_score:          700,
  borrower_address:      f(20),
  issuer_nonce:          f(30),
  secret_key:            f(40),
  position_id:           f(50),
};

console.log("=== E2E Proof: open_position ===");
const generated = await generateProof("open_position", inputs);
const contractFmt = toContractFormat(generated);

console.log(`\nProof bytes: ${contractFmt.proof.length}`);
console.log(`Public input bytes: ${contractFmt.publicInputs.length} (${generated.publicInputs.length} fields)`);
console.log(`Public input hex: ${contractFmt.publicInputs.toString("hex")}`);

const PROOF_OUT = join(CIRCUITS_DIR, "test_open_position.proof.bin");
const PI_OUT = join(CIRCUITS_DIR, "test_open_position.pi.bin");
writeFileSync(PROOF_OUT, contractFmt.proof);
writeFileSync(PI_OUT, contractFmt.publicInputs);
console.log(`\nSaved: ${PROOF_OUT} (${contractFmt.proof.length} bytes)`);
console.log(`Saved: ${PI_OUT} (${contractFmt.publicInputs.length} bytes)`);

// Also generate the CLI command
const proofHex = contractFmt.proof.toString("hex");
const piHex = contractFmt.publicInputs.toString("hex");
console.log(`\nstellar contract invoke \\\n\
  --id VERIFIER_ID --source deployer \\\n\
  --rpc-url https://rpc.ankr.com/stellar_testnet_soroban \\\n\
  --network-passphrase "Test SDF Network ; September 2015" \\\n\
  -- verify \\\n\
  --circuit-id 0 \\\n\
  --proof ${proofHex} \\\n\
  --public-inputs ${piHex}`);
