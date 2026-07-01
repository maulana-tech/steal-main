"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWallet } from "@/components/wallet/WalletProvider";
import { WalletGate } from "@/components/wallet/WalletGate";
import {
  resolveClaim,
  paymentNullifier,
  markClaimed,
  loadPayment,
  fromBaseUnits,
} from "@/lib/payments";

type State = "loading" | "invalid" | "ready" | "claimed" | "claiming" | "success" | "error";

export default function ClaimPaymentPage() {
  const params = useParams();
  const commitment = String((params?.commitment as string) ?? "");
  const { address, signTransaction } = useWallet();

  const [state, setState] = useState<State>("loading");
  const [amount, setAmount] = useState<string>("");
  const [secret, setSecret] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onChain, setOnChain] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!/^[0-9a-fA-F]{64}$/.test(commitment)) {
        if (active) setState("invalid");
        return;
      }
      const resolved = await resolveClaim(commitment, window.location.hash);
      if (!active) return;
      if (!resolved || !resolved.valid) {
        setState("invalid");
        return;
      }
      setAmount(fromBaseUnits(resolved.amountBase));
      setSecret(resolved.secret);

      // Claimed status: local record + best-effort on-chain check.
      let claimed = loadPayment(commitment)?.claimed ?? false;
      try {
        const { NETWORK_CONFIG, isPaymentClaimed } = await import("@eclipse/sdk");
        if (NETWORK_CONFIG.contracts.paymentPool) {
          setOnChain(true);
          claimed = claimed || (await isPaymentClaimed(Buffer.from(commitment, "hex")));
        }
      } catch {
        /* ignore — demo mode */
      }
      if (active) setState(claimed ? "claimed" : "ready");
    })();
    return () => {
      active = false;
    };
  }, [commitment]);

  async function claim() {
    if (secret === null || !address) return;
    setState("claiming");
    setError(null);
    try {
      // Derive the nullifier (blocks double-claims). The real on-chain claim
      // additionally submits a claim_payment proof — that path activates once
      // the circuit is built (pnpm build:circuits) and the pool is deployed.
      await paymentNullifier(secret, commitment);
      markClaimed(commitment);
      setState("success");
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Claim failed.");
      setState("error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64 }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo/steal-logo-light.png" alt="Steal Logo" style={{ height: 18, width: "auto" }} />
          <span style={{ fontWeight: 500, color: "var(--foreground)" }}>Steal</span>
        </Link>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(124,58,237,0.12)",
            color: "#a78bfa",
            border: "1px solid rgba(124,58,237,0.25)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Claim
        </span>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px" }}>
        {state === "loading" && (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Loading payment…</div>
        )}

        {state === "invalid" && (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Invalid payment link</h1>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
              This link is malformed or missing its secret. Ask the sender to share the full link again.
            </p>
          </div>
        )}

        {(state === "ready" || state === "claiming" || state === "claimed") && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>
                {state === "claimed" ? "Already claimed" : "You received a payment!"}
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
                {state === "claimed"
                  ? "This payment has already been claimed. A nullifier prevents it being claimed twice."
                  : "Only you — the holder of this link — can see the amount and claim it."}
              </p>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: 12,
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              <div className="label" style={{ color: "#a78bfa" }}>Amount</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                {amount} <span style={{ fontSize: 15, color: "var(--muted)" }}>USDC</span>
              </div>
            </div>

            {state !== "claimed" && (
              <>
                <WalletGate />
                {address && (
                  <button className="btn btn-violet" onClick={claim} disabled={state === "claiming"}>
                    {state === "claiming" ? "Claiming…" : "Claim Payment"}
                  </button>
                )}
              </>
            )}

            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              {onChain
                ? "On-chain: only the commitment is public — amount, sender and receiver stay hidden."
                : "Demo mode: claim is recorded client-side. On-chain settlement activates once the payment pool is deployed."}
            </p>
          </div>
        )}

        {state === "success" && (
          <div
            className="card"
            style={{
              textAlign: "center",
              borderColor: "rgba(34,197,94,0.3)",
              background: "rgba(34,197,94,0.05)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>Payment claimed</h1>
            <div style={{ fontSize: 28, fontWeight: 700, margin: "12px 0" }}>
              {amount} <span style={{ fontSize: 14, color: "var(--muted)" }}>USDC</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, wordBreak: "break-all" }}>
              Sent to {address ? `${address.slice(0, 6)}…${address.slice(-6)}` : "your wallet"}. The public only
              ever sees the commitment.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="card" style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--red)" }}>Claim failed</h1>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>{error}</p>
            <button className="btn btn-ghost" onClick={() => setState("ready")} style={{ marginTop: 16 }}>
              Try again
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
            ← Back to app
          </Link>
        </div>
      </div>
    </div>
  );
}
