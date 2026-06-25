"use client";

import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import HealthFactorMeter from "@/components/HealthFactorMeter";
import ProofStatus, { ProofState } from "@/components/ProofStatus";
import OraclePriceSlider from "@/components/OraclePriceSlider";

export default function BorrowerPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [collateral, setCollateral] = useState("1000");
  const [debt, setDebt] = useState("750");
  const [score, setScore] = useState("720");
  const [oraclePrice, setOraclePrice] = useState(100_000);
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const collateralUsd = (Number(collateral) * oraclePrice) / 1_000_000;
  const ltv = Number(score) >= 700 ? 120 : Number(score) >= 500 ? 75 : 50;
  const maxDebt = (collateralUsd * ltv) / 100;
  const hf = Number(debt) > 0 ? collateralUsd / Number(debt) : Infinity;
  const debtOverLimit = Number(debt) > maxDebt;

  async function handleOpen() {
    if (!wallet) return;
    try {
      setProofState("generating");
      const { ProofGenerator } = await import("@eclipse/proof-gen");
      const { randomField, commit, nullifier } = await import("@eclipse/crypto");

      const saltC = randomField();
      const saltD = randomField();
      const sk = randomField();
      const pid = randomField();

      const [cc, dc, nh] = await Promise.all([
        commit(BigInt(collateral), saltC),
        commit(BigInt(debt), saltD),
        nullifier(sk, pid),
      ]);

      const gen = await ProofGenerator.create();
      await gen.proveOpenPosition({
        collateral_commitment: "0x" + cc.toString(16).padStart(64, "0"),
        debt_commitment: "0x" + dc.toString(16).padStart(64, "0"),
        credit_attestation: "0x" + (0n).toString(16).padStart(64, "0"),
        oracle_price_usd: oraclePrice,
        min_credit_threshold: 300,
        liq_threshold_bps: 100,
        nullifier_hash: "0x" + nh.toString(16).padStart(64, "0"),
        collateral: Number(collateral),
        salt_c: "0x" + saltC.toString(16).padStart(64, "0"),
        debt: Number(debt),
        salt_d: "0x" + saltD.toString(16).padStart(64, "0"),
        credit_score: Number(score),
        borrower_address: "0x" + (1n).toString(16).padStart(64, "0"),
        issuer_nonce: "0x" + (1n).toString(16).padStart(64, "0"),
        secret_key: "0x" + sk.toString(16).padStart(64, "0"),
        position_id: "0x" + pid.toString(16).padStart(64, "0"),
      });

      setProofState("submitting");
      await new Promise((r) => setTimeout(r, 1200));
      setTxHash("demo_" + Math.random().toString(36).slice(2, 10));
      setProofState("success");
    } catch (e) {
      console.error(e);
      setProofState("error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 64px" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/"
          style={{
            fontSize: 13,
            color: "var(--muted)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Eclipse
        </a>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(124,58,237,0.1)",
            color: "#a78bfa",
            border: "1px solid rgba(124,58,237,0.2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Borrower
        </span>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Open Position
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Your collateral, debt, and credit score are hidden behind ZK commitments.
          Only you and your auditor can see the actual numbers.
        </p>

        <WalletConnect onConnect={setWallet} />

        {wallet && (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <OraclePriceSlider value={oraclePrice} onChange={setOraclePrice} />

            {/* Inputs */}
            <div className="card">
              <div className="label" style={{ marginBottom: 16 }}>Position Parameters</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field
                  label="Collateral (XLM)"
                  value={collateral}
                  onChange={setCollateral}
                  hint={`≈ $${collateralUsd.toFixed(2)} USD`}
                />
                <Field
                  label="Credit Score"
                  value={score}
                  onChange={setScore}
                  hint={`LTV tier: ${ltv}% → max borrow $${maxDebt.toFixed(2)}`}
                />
                <Field
                  label="Borrow Amount (USDC)"
                  value={debt}
                  onChange={setDebt}
                  hint={debtOverLimit ? "⚠ Exceeds LTV limit" : "Within LTV limit"}
                  error={debtOverLimit}
                />
              </div>
            </div>

            <HealthFactorMeter healthFactor={isFinite(hf) ? hf : 0} />

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              {[
                { label: "Collateral USD", value: `$${collateralUsd.toFixed(2)}` },
                { label: "LTV", value: `${ltv}%` },
                { label: "Max Borrow", value: `$${maxDebt.toFixed(2)}` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: "12px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <div className="label" style={{ marginBottom: 4 }}>{label}</div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            <ProofStatus state={proofState} />

            {txHash && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  padding: "8px 12px",
                  background: "var(--surface)",
                  borderRadius: 6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                On-chain (commitments only, no amounts visible):{" "}
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#a78bfa" }}
                >
                  {txHash}
                </a>
              </div>
            )}

            <button
              className="btn btn-violet"
              onClick={handleOpen}
              disabled={
                debtOverLimit ||
                proofState === "generating" ||
                proofState === "submitting"
              }
            >
              {proofState === "generating"
                ? "Generating Proof…"
                : proofState === "submitting"
                ? "Submitting…"
                : "Open Position"}
            </button>

            <p
              style={{
                fontSize: 11,
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              Proof generated in browser via WASM · Private inputs never leave your device
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, hint, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        style={error ? { borderColor: "var(--red)" } : {}}
      />
      {hint && (
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: error ? "var(--red)" : "var(--muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
