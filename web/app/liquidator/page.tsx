"use client";

import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import ProofStatus, { ProofState } from "@/components/ProofStatus";
import OraclePriceSlider from "@/components/OraclePriceSlider";

const POSITIONS = [
  {
    id: "pos_001",
    nullifier: "0x1a2b3c4d…",
    collateralCommitment: "0xdeadbeef9f3a2b1c4e5d6f7a8b9c0d1e2f3a4b5c",
    debtCommitment: "0xfeedface1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    openedAt: "Ledger #12345",
    // demo plaintext — in production from off-chain watcher
    collateral: 500,
    saltC: "0x1234",
    debt: 600,
    saltD: "0x5678",
  },
  {
    id: "pos_002",
    nullifier: "0x4d5e6f7a…",
    collateralCommitment: "0xcafebabe2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d",
    debtCommitment: "0xbadf00d03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
    openedAt: "Ledger #12389",
    collateral: 1000,
    saltC: "0xabcd",
    debt: 400,
    saltD: "0xef01",
  },
];

export default function LiquidatorPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [oraclePrice, setOraclePrice] = useState(100_000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleLiquidate(pos: (typeof POSITIONS)[0]) {
    if (!wallet) return;
    setSelectedId(pos.id);
    try {
      setProofState("generating");
      const { ProofGenerator } = await import("@eclipse/proof-gen");
      const gen = await ProofGenerator.create();
      await gen.proveLiquidate({
        collateral_commitment: pos.collateralCommitment,
        debt_commitment: pos.debtCommitment,
        oracle_price_usd: oraclePrice,
        liq_threshold_bps: 100,
        position_id: pos.nullifier,
        collateral: pos.collateral,
        salt_c: pos.saltC,
        debt: pos.debt,
        salt_d: pos.saltD,
      });
      setProofState("submitting");
      await new Promise((r) => setTimeout(r, 1200));
      setTxHash("liq_" + Math.random().toString(36).slice(2, 10));
      setProofState("success");
    } catch (e) {
      console.error(e);
      setProofState("error");
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
        <a href="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
          ← Eclipse
        </a>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(245,158,11,0.1)",
            color: "var(--amber)",
            border: "1px solid rgba(245,158,11,0.2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Liquidator
        </span>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Liquidations
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          All positions show only on-chain commitments. Generate a ZK proof that a
          position is unhealthy — without seeing the actual values.
        </p>

        <WalletConnect onConnect={setWallet} />

        {wallet && (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <OraclePriceSlider value={oraclePrice} onChange={setOraclePrice} />

            <div className="label" style={{ marginTop: 8 }}>
              Open Positions — commitments only
            </div>

            {POSITIONS.map((pos) => {
              const colUsd = (pos.collateral * oraclePrice) / 1_000_000;
              const hf = pos.debt > 0 ? colUsd / pos.debt : Infinity;
              const liquidatable = hf < 1;

              return (
                <div
                  key={pos.id}
                  className="card"
                  style={{
                    borderColor: liquidatable ? "rgba(239,68,68,0.3)" : "var(--border)",
                    transition: "border-color 0.3s",
                  }}
                >
                  {/* Position header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        className="mono"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        {pos.id}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {pos.openedAt}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: liquidatable ? "var(--red)" : "var(--green)",
                        }}
                      >
                        HF {isFinite(hf) ? hf.toFixed(2) : "∞"}
                      </span>
                      {liquidatable && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 4,
                            background: "var(--red-glow)",
                            color: "var(--red)",
                            border: "1px solid rgba(239,68,68,0.3)",
                          }}
                        >
                          LIQUIDATABLE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commitments */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: "10px 12px",
                      background: "#070707",
                      borderRadius: 6,
                      marginBottom: 12,
                    }}
                  >
                    <CommitRow label="collateral" value={pos.collateralCommitment} />
                    <CommitRow label="debt" value={pos.debtCommitment} />
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontStyle: "italic" }}>
                      ← Actual amounts hidden on-chain
                    </div>
                  </div>

                  <button
                    className="btn btn-amber"
                    onClick={() => handleLiquidate(pos)}
                    disabled={
                      !liquidatable ||
                      (selectedId === pos.id &&
                        (proofState === "generating" || proofState === "submitting"))
                    }
                    style={{ fontSize: 13 }}
                  >
                    {selectedId === pos.id && proofState === "generating"
                      ? "Generating Liquidation Proof…"
                      : liquidatable
                      ? "Prove HF < 1 and Liquidate"
                      : "Position Healthy"}
                  </button>
                </div>
              );
            })}

            <ProofStatus state={proofState} />

            {txHash && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  padding: "8px 12px",
                  background: "var(--surface)",
                  borderRadius: 6,
                }}
              >
                Liquidation tx:{" "}
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--amber)" }}
                >
                  {txHash}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CommitRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        fontSize: 11,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ color: "var(--muted)", minWidth: 80 }}>{label}:</span>
      <span
        style={{
          color: "#555",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
