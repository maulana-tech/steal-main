"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/wallet/WalletProvider";
import QrCode from "@/components/pay/QrCode";
import { createPaymentLink, type PaymentRecord } from "@/lib/payments";

type OnChain = "idle" | "locking" | "locked" | "skipped" | "failed";

export default function CreatePaymentPage() {
  const { address, signTransaction } = useWallet();
  const [amount, setAmount] = useState("50");
  const [result, setResult] = useState<{ record: PaymentRecord; link: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onChain, setOnChain] = useState<OnChain>("idle");

  async function generate() {
    setError(null);
    const n = Number(amount);
    if (!n || n <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setLoading(true);
    setOnChain("idle");
    try {
      const origin = window.location.origin;
      const res = await createPaymentLink(amount, origin);
      setResult(res);

      // Best-effort real lock: only when the payment pool + USDC token are
      // configured (i.e. after deploy) and a wallet is connected.
      const { NETWORK_CONFIG, createPayment } = await import("@eclipse/sdk");
      if (address && NETWORK_CONFIG.contracts.paymentPool && NETWORK_CONFIG.usdcToken) {
        setOnChain("locking");
        try {
          await createPayment({
            sender: { publicKey: address, signTransaction },
            commitment: Buffer.from(res.record.commitment, "hex"),
            amount: BigInt(res.record.amountBase),
          });
          setOnChain("locked");
        } catch (e) {
          console.error("On-chain lock failed:", e);
          setOnChain("failed");
        }
      } else {
        setOnChain("skipped");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to create payment link.");
    }
    setLoading(false);
  }

  function reset() {
    setResult(null);
    setError(null);
    setOnChain("idle");
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
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
          Payments
        </span>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Send a confidential payment
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Lock an amount behind a commitment and share a link. Only the holder of the
          link can claim it, and the amount stays hidden in the link — never on a server.
        </p>

        {!result ? (
          <div className="card">
            <div className="label" style={{ marginBottom: 16 }}>Amount</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  style={{ paddingRight: 64 }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "var(--muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  USDC
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                The recipient learns the amount only after opening the link.
              </span>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: "var(--red)",
                  padding: "8px 12px",
                  background: "var(--red-glow)",
                  borderRadius: 6,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-violet"
              onClick={generate}
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? "Generating…" : "Generate Payment Link"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div className="label">Payment ready</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
                  {result.record.amountDisplay} <span style={{ fontSize: 14, color: "var(--muted)" }}>USDC</span>
                </div>
              </div>

              <QrCode value={result.link} downloadName={`payment-${result.record.commitment.slice(0, 8)}.png`} />

              <div style={{ width: "100%" }}>
                <div className="label" style={{ marginBottom: 6 }}>Shareable link</div>
                <div
                  className="mono"
                  onClick={copyLink}
                  style={{
                    fontSize: 12,
                    color: "#a78bfa",
                    wordBreak: "break-all",
                    background: "#080808",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                  }}
                >
                  {result.link}
                </div>
                <button
                  className="btn btn-violet"
                  onClick={copyLink}
                  style={{ marginTop: 12 }}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
                {onChain === "locked" && "USDC locked on-chain — only the commitment is public."}
                {onChain === "locking" && "Locking USDC on-chain…"}
                {onChain === "failed" &&
                  "Link created. On-chain lock failed (check wallet / balance) — the link still works for the demo."}
                {(onChain === "skipped" || onChain === "idle") &&
                  "Demo mode: link generated client-side. On-chain locking activates once the payment pool contract is deployed."}
              </div>
            </div>

            <button className="btn btn-ghost" onClick={reset}>
              Create another
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
