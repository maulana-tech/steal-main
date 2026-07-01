/**
 * @eclipse/crypto
 *
 * Client-side cryptographic primitives:
 *   - Poseidon2 commitment (matches Noir circuit + Stellar host function)
 *   - View-key encryption/decryption (AES-GCM, key derived from wallet)
 *   - Salt and nullifier generation
 *
 * All operations run in the browser; secrets never leave the device.
 *
 * Poseidon2 is computed via @aztec/bb.js Barretenberg WASM,
 * matching the Noir circuit implementation exactly.
 */

// ── Field type ────────────────────────────────────────────────────────────────
export type Field = bigint; // BN254 scalar field element

// BN254 scalar field modulus
const BN254_FR_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// ── Poseidon2 (via @aztec/bb.js Barretenberg WASM) ────────────────────────────
// Lazy-loaded to avoid SSR issues with WASM.
// Uses the exact same Barretenberg implementation as the proving backend,
// guaranteeing byte-perfect match with Noir circuit + Soroban host function.

/** @internal Lazy BB instance. */
let _bb: any = null;

async function getBB() {
  if (!_bb) {
    const { Barretenberg } = await import("@aztec/bb.js");
    _bb = Barretenberg.new({ threads: 1 });
  }
  return _bb;
}

/**
 * Poseidon2 hash of field inputs.
 * Delegates to @aztec/bb.js Barretenberg WASM for exact match with Noir.
 */
export async function poseidon2(inputs: Field[]): Promise<Field> {
  const { Fr } = await import("@aztec/bb.js");
  const bb = await getBB();
  const result = await bb.poseidon2Hash(inputs.map((f) => new Fr(f)));
  return BigInt(result.toString());
}

/**
 * commit(value, salt) = Poseidon2([value, salt])
 */
export async function commit(value: bigint, salt: Field): Promise<Field> {
  return poseidon2([value, salt]);
}

/**
 * nullifier(secretKey, positionId) = Poseidon2([secretKey, positionId])
 */
export async function nullifier(secretKey: Field, positionId: Field): Promise<Field> {
  return poseidon2([secretKey, positionId]);
}

// ── View key ──────────────────────────────────────────────────────────────────

export interface PositionSecrets {
  collateral: bigint;
  saltC: bigint;
  debt: bigint;
  saltD: bigint;
  creditScore: bigint;
  issuerNonce: bigint;
  secretKey: bigint;
  positionId: bigint;
}

/**
 * Derives an AES-GCM key from a wallet-signed message.
 */
export async function deriveViewKey(walletSignature: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    walletSignature.slice(0, 32),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("eclipse-view-key-v1"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random 128-bit key as a hex string with "vk_" prefix.
 */
export function generateRandomViewKeyHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "vk_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Imports a hex string key with "vk_" prefix as an AES-GCM CryptoKey.
 */
export async function importViewKey(hexKey: string): Promise<CryptoKey> {
  const rawHex = hexKey.replace("vk_", "");
  const bytes = new Uint8Array(
    rawHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts position secrets with the borrower's view key.
 */
export async function encryptSecrets(
  secrets: PositionSecrets,
  viewKey: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const plaintext = new TextEncoder().encode(
    JSON.stringify({
      collateral: secrets.collateral.toString(),
      saltC: secrets.saltC.toString(),
      debt: secrets.debt.toString(),
      saltD: secrets.saltD.toString(),
      creditScore: secrets.creditScore.toString(),
      issuerNonce: secrets.issuerNonce.toString(),
      secretKey: secrets.secretKey.toString(),
      positionId: secrets.positionId.toString(),
    })
  );
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array & ArrayBufferView;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    viewKey,
    plaintext
  );
  return { ciphertext: new Uint8Array(ciphertext), iv: iv as Uint8Array };
}

/**
 * Decrypts position secrets.
 */
export async function decryptSecrets(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  viewKey: CryptoKey
): Promise<PositionSecrets> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    viewKey,
    ciphertext as any
  );
  const obj = JSON.parse(new TextDecoder().decode(plaintext));
  return {
    collateral: BigInt(obj.collateral),
    saltC: BigInt(obj.saltC),
    debt: BigInt(obj.debt),
    saltD: BigInt(obj.saltD),
    creditScore: BigInt(obj.creditScore),
    issuerNonce: BigInt(obj.issuerNonce),
    secretKey: BigInt(obj.secretKey),
    positionId: BigInt(obj.positionId),
  };
}

// ── Randomness helpers ────────────────────────────────────────────────────────

export function randomField(): bigint {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  const raw = BigInt(
    "0x" + Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("")
  );
  return raw % BN254_FR_MODULUS;
}

export function fieldToBytes(f: bigint): Uint8Array {
  const hex = f.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToField(bytes: Uint8Array): bigint {
  return BigInt(
    "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}
