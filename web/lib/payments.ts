/**
 * Confidential payment-link helpers (client-side).
 *
 * A payment is a Poseidon commitment to (secret, amount, salt). The commitment
 * goes in the link path; the secret/amount/salt travel in the URL *fragment*,
 * which browsers never send to a server — so the amount stays private end to
 * end. Scanning the QR simply opens the claim URL on the recipient's device.
 *
 * Mirrors the app's honest-WIP model: commitments are computed with the stub
 * Poseidon in @eclipse/crypto and records are kept in localStorage, while the
 * real on-chain lock/claim (payment-pool contract) activates once deployed.
 */
import { poseidon2, nullifier as nullifierFn, randomField } from "@eclipse/crypto";

// Stellar SEP-41 assets (incl. testnet USDC) use 7 decimals.
export const USDC_DECIMALS = 7;
const SCALE = 10n ** BigInt(USDC_DECIMALS);

export interface PaymentRecord {
  commitment: string; // 64-char hex (no 0x)
  amountBase: string; // bigint string, USDC base units
  amountDisplay: string; // human-readable, e.g. "50"
  secret: string; // bigint string
  salt: string; // bigint string
  claimed: boolean;
  createdAt: number;
}

interface FragmentPayload {
  s: string; // secret (decimal string)
  a: string; // amount base units (decimal string)
  t: string; // salt (decimal string)
}

const fieldToHex = (f: bigint) => f.toString(16).padStart(64, "0");

function toBase64Url(obj: FragmentPayload): string {
  const json = JSON.stringify(obj);
  const b64 = btoa(json);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): FragmentPayload {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(b64);
  return JSON.parse(json) as FragmentPayload;
}

/** Parse a human amount ("50", "12.5") into USDC base units (bigint). */
export function toBaseUnits(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt(whole || "0") * SCALE + BigInt(fracPadded || "0");
}

/** Format USDC base units back to a human string, trimming trailing zeros. */
export function fromBaseUnits(base: bigint): string {
  const whole = base / SCALE;
  const frac = (base % SCALE).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

const lsKey = (commitment: string) => `payment_${commitment}`;

/**
 * Create a confidential payment: generate secret/salt, compute the commitment,
 * persist a local record, and build the shareable link.
 */
export async function createPaymentLink(
  amountDisplay: string,
  origin: string
): Promise<{ record: PaymentRecord; link: string }> {
  const secret = randomField();
  const salt = randomField();
  const amountBase = toBaseUnits(amountDisplay);

  // commitment = Poseidon2([secret, amount, salt]) — matches claim_payment circuit.
  const commitmentField = await poseidon2([secret, amountBase, salt]);
  const commitment = fieldToHex(commitmentField);

  const record: PaymentRecord = {
    commitment,
    amountBase: amountBase.toString(),
    amountDisplay,
    secret: secret.toString(),
    salt: salt.toString(),
    claimed: false,
    createdAt: Date.now(),
  };
  savePayment(record);

  const fragment = toBase64Url({ s: record.secret, a: record.amountBase, t: record.salt });
  const link = `${origin}/pay/claim/${commitment}#${fragment}`;
  return { record, link };
}

/**
 * Resolve the claim data for a commitment, preferring the URL fragment (works
 * cross-device) and falling back to a local record (same browser). Verifies the
 * commitment opens to the payload before returning.
 */
export async function resolveClaim(
  commitment: string,
  fragment: string
): Promise<{ amountBase: bigint; secret: bigint; salt: bigint; valid: boolean } | null> {
  let payload: FragmentPayload | null = null;

  const frag = fragment.replace(/^#/, "");
  if (frag) {
    try {
      payload = fromBase64Url(frag);
    } catch {
      payload = null;
    }
  }
  if (!payload) {
    const rec = loadPayment(commitment);
    if (rec) payload = { s: rec.secret, a: rec.amountBase, t: rec.salt };
  }
  if (!payload) return null;

  const secret = BigInt(payload.s);
  const amountBase = BigInt(payload.a);
  const salt = BigInt(payload.t);

  const recomputed = fieldToHex(await poseidon2([secret, amountBase, salt]));
  return { amountBase, secret, salt, valid: recomputed === commitment };
}

/** nullifier = Poseidon2([secret, commitment]) — blocks double-claims. */
export async function paymentNullifier(secret: bigint, commitment: string): Promise<string> {
  const n = await nullifierFn(secret, BigInt("0x" + commitment));
  return fieldToHex(n);
}

// ── localStorage record helpers ────────────────────────────────────────────

export function savePayment(rec: PaymentRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(lsKey(rec.commitment), JSON.stringify(rec));
}

export function loadPayment(commitment: string): PaymentRecord | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(lsKey(commitment));
  return raw ? (JSON.parse(raw) as PaymentRecord) : null;
}

export function markClaimed(commitment: string): void {
  const rec = loadPayment(commitment);
  if (rec) savePayment({ ...rec, claimed: true });
}

/** All locally-known payments (for the sender's "my links" list), newest first. */
export function listPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  const out: PaymentRecord[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("payment_")) {
      try {
        out.push(JSON.parse(localStorage.getItem(k)!) as PaymentRecord);
      } catch {
        /* skip malformed */
      }
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
