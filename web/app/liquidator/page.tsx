"use client";

import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import ProofStatus, { ProofState } from "@/components/ProofStatus";
import OraclePriceSlider from "@/components/OraclePriceSlider";

// Mock positions — on-chain only commitments are visible
const MOCK_POSITIONS = [
  {
    id: "pos_001",
    nullifier: "0x1a2b3c...",
    collateralCommitment: "0xdeadbeef...a1",
    debtCommitment: "0xfeedface...b2",
    openedAt: "Ledger #12345",
  },
  {
    id: "pos_002",
    nullifier: "0x4d5e6f...",
    collateralCommitment: "0xcafebabe...c3",
    debtCommitment: "0xbadf00d0...d4",
    openedAt: "Ledger #12389",
  },
];

export default function LiquidatorPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [oraclePrice, setOraclePrice] = useState<number>(100_000);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  // In a real scenario the liquidator runs a watcher that decrypts positions
  // they've been given permission to monitor (via shared view key or public data).
  // For demo: liquidator has the plaintext values of pos_001.
  const DEMO_PLAINTEXT = {
    collateral: 500,
    saltC: "0x1234...",
    debt: 600, // unhealthy at current price
    saltD: "0x5678...",
  };

  async function handleLiquidate(positionId: string) {
    if (!walletAddress) return;
    setSelectedPosition(positionId);

    try {
      setProofState("generating");

      const { ProofGenerator } = await import("@eclipse/proof-gen");
      const gen = await ProofGenerator.create();

      await gen.proveLiquidate({
        collateral_commitment: MOCK_POSITIONS[0].collateralCommitment,
        debt_commitment: MOCK_POSITIONS[0].debtCommitment,
        oracle_price_usd: oraclePrice,
        liq_threshold_bps: 100,
        position_id: MOCK_POSITIONS[0].nullifier,
        collateral: DEMO_PLAINTEXT.collateral,
        salt_c: DEMO_PLAINTEXT.saltC,
        debt: DEMO_PLAINTEXT.debt,
        salt_d: DEMO_PLAINTEXT.saltD,
      });

      setProofState("submitting");
      await new Promise((r) => setTimeout(r, 1500));
      setTxHash("liq_" + Math.random().toString(36).slice(2));
      setProofState("success");
    } catch (err) {
      console.error(err);
      setProofState("error");
    }
  }

  // Health factor estimate based on demo plaintext + current oracle price
  const collateralValueUsd = (DEMO_PLAINTEXT.collateral * oraclePrice) / 1_000_000;
  const demoHF = DEMO_PLAINTEXT.debt > 0 ? collateralValueUsd / DEMO_PLAINTEXT.debt : Infinity;
  const isLiquidatable = demoHF < 1;

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">
        <span className="text-amber-400">Liquidator</span> Dashboard
      </h1>
      <p className="text-eclipse-muted mb-8 text-sm">
        All positions below show only on-chain commitments. You can prove a
        position is unhealthy and liquidate it without knowing the exact numbers.
      </p>

      <WalletConnect onConnect={setWalletAddress} />

      {walletAddress && (
        <div className="mt-8 space-y-6">
          {/* Oracle price slider — the key demo interaction */}
          <div className="rounded-xl border border-eclipse-border bg-eclipse-surface p-4">
            <p className="text-sm text-eclipse-muted mb-3">
              Drop the oracle price below to make position 001 liquidatable:
            </p>
            <OraclePriceSlider value={oraclePrice} onChange={setOraclePrice} />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm">Demo HF for pos_001:</span>
              <span
                className={`font-mono font-bold ${
                  isLiquidatable ? "text-red-400" : "text-green-400"
                }`}
              >
                {isFinite(demoHF) ? demoHF.toFixed(3) : "∞"}
              </span>
              {isLiquidatable && (
                <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                  LIQUIDATABLE
                </span>
              )}
            </div>
          </div>

          {/* Position list */}
          <div className="space-y-4">
            <h2 className="font-semibold text-sm text-eclipse-muted uppercase tracking-wider">
              Open Positions (on-chain view — commitments only)
            </h2>

            {MOCK_POSITIONS.map((pos) => (
              <div
                key={pos.id}
                className="rounded-xl border border-eclipse-border bg-eclipse-surface p-5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono text-xs text-eclipse-muted">{pos.id}</p>
                    <p className="text-xs text-eclipse-muted mt-1">{pos.openedAt}</p>
                  </div>
                  {pos.id === "pos_001" && isLiquidatable && (
                    <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                      Unhealthy
                    </span>
                  )}
                </div>

                <p className="text-xs text-eclipse-muted font-mono truncate">
                  Collateral: {pos.collateralCommitment}
                </p>
                <p className="text-xs text-eclipse-muted font-mono truncate">
                  Debt: {pos.debtCommitment}
                </p>
                <p className="text-xs text-eclipse-muted mt-1 italic">
                  ← Actual amounts hidden on-chain
                </p>

                {pos.id === "pos_001" && (
                  <button
                    onClick={() => handleLiquidate(pos.id)}
                    disabled={!isLiquidatable || proofState === "generating" || proofState === "submitting"}
                    className="mt-4 w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500
                      disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                  >
                    {selectedPosition === pos.id && proofState === "generating"
                      ? "Generating Liquidation Proof…"
                      : "Generate ZK Proof & Liquidate"}
                  </button>
                )}
              </div>
            ))}
          </div>

          <ProofStatus state={proofState} />

          {txHash && (
            <p className="text-xs text-eclipse-muted">
              Liquidation tx:{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 underline"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      )}
    </main>
  );
}
