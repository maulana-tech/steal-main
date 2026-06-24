"use client";

import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import HealthFactorMeter from "@/components/HealthFactorMeter";
import ProofStatus, { ProofState } from "@/components/ProofStatus";
import OraclePriceSlider from "@/components/OraclePriceSlider";

interface PositionForm {
  collateral: string;
  debt: string;
  creditScore: string;
}

export default function BorrowerPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [form, setForm] = useState<PositionForm>({
    collateral: "1000",
    debt: "750",
    creditScore: "720",
  });
  const [oraclePrice, setOraclePrice] = useState<number>(100_000); // 0.10 USD scaled 1e6
  const [proofState, setProofState] = useState<ProofState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Derived: collateral value in USD
  const collateralValueUsd = (Number(form.collateral) * oraclePrice) / 1_000_000;
  const ltv = Number(form.creditScore) >= 700 ? 120 : Number(form.creditScore) >= 500 ? 75 : 50;
  const maxDebt = (collateralValueUsd * ltv) / 100;
  const healthFactor =
    Number(form.debt) > 0 ? collateralValueUsd / Number(form.debt) : Infinity;

  async function handleOpenPosition() {
    if (!walletAddress) return;

    try {
      setProofState("generating");

      // Dynamic import to avoid SSR issues with WASM
      const { ProofGenerator } = await import("@eclipse/proof-gen");
      const { randomField, commit, nullifier, fieldToBytes } = await import("@eclipse/crypto");

      const saltC = randomField();
      const saltD = randomField();
      const secretKey = randomField();
      const positionId = randomField();

      const [collateralCommitment, debtCommitment, nullifierHash] = await Promise.all([
        commit(BigInt(form.collateral), saltC),
        commit(BigInt(form.debt), saltD),
        nullifier(secretKey, positionId),
      ]);

      const gen = await ProofGenerator.create();
      const proof = await gen.proveOpenPosition({
        collateral_commitment: "0x" + collateralCommitment.toString(16).padStart(64, "0"),
        debt_commitment: "0x" + debtCommitment.toString(16).padStart(64, "0"),
        credit_attestation: "0x" + (0n).toString(16).padStart(64, "0"), // [STUB] real attestation from CreditIssuer
        oracle_price_usd: oraclePrice,
        min_credit_threshold: 300,
        liq_threshold_bps: 100,
        nullifier_hash: "0x" + nullifierHash.toString(16).padStart(64, "0"),
        collateral: Number(form.collateral),
        salt_c: "0x" + saltC.toString(16).padStart(64, "0"),
        debt: Number(form.debt),
        salt_d: "0x" + saltD.toString(16).padStart(64, "0"),
        credit_score: Number(form.creditScore),
        borrower_address: "0x" + BigInt("0x" + walletAddress.slice(0, 16)).toString(16).padStart(64, "0"),
        issuer_nonce: "0x" + (1n).toString(16).padStart(64, "0"),
        secret_key: "0x" + secretKey.toString(16).padStart(64, "0"),
        position_id: "0x" + positionId.toString(16).padStart(64, "0"),
      });

      setProofState("submitting");

      // TODO: submit to Stellar via @eclipse/sdk openPosition()
      // For now simulate a tx hash
      await new Promise((r) => setTimeout(r, 1500));
      setTxHash("demo_" + Math.random().toString(36).slice(2));
      setProofState("success");
    } catch (err) {
      console.error(err);
      setProofState("error");
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">
        <span className="text-violet-400">Borrower</span> Dashboard
      </h1>
      <p className="text-eclipse-muted mb-8 text-sm">
        Your collateral and debt amounts are hidden behind ZK commitments.
        Only you (and your auditor via view key) can see the actual numbers.
      </p>

      <WalletConnect onConnect={setWalletAddress} />

      {walletAddress && (
        <div className="mt-8 space-y-6">
          {/* Oracle price slider for demo */}
          <OraclePriceSlider value={oraclePrice} onChange={setOraclePrice} />

          {/* Position inputs */}
          <div className="rounded-xl border border-eclipse-border bg-eclipse-surface p-6 space-y-4">
            <h2 className="font-semibold text-sm text-eclipse-muted uppercase tracking-wider">
              Position Parameters
            </h2>

            <InputRow
              label="Collateral (XLM)"
              value={form.collateral}
              onChange={(v) => setForm((f) => ({ ...f, collateral: v }))}
              hint={`≈ $${collateralValueUsd.toFixed(2)} USD at current price`}
            />
            <InputRow
              label="Credit Score"
              value={form.creditScore}
              onChange={(v) => setForm((f) => ({ ...f, creditScore: v }))}
              hint={`LTV: ${ltv}% → max borrow $${maxDebt.toFixed(2)}`}
            />
            <InputRow
              label="Borrow (USDC)"
              value={form.debt}
              onChange={(v) => setForm((f) => ({ ...f, debt: v }))}
              hint={Number(form.debt) > maxDebt ? "⚠️ Exceeds LTV limit" : "Within LTV"}
            />
          </div>

          {/* Health factor */}
          <HealthFactorMeter healthFactor={isFinite(healthFactor) ? healthFactor : 0} />

          {/* Proof generation */}
          <ProofStatus state={proofState} />

          {txHash && (
            <p className="text-xs text-eclipse-muted">
              Explorer (commitments only, no amounts visible):{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 underline"
              >
                {txHash.slice(0, 20)}…
              </a>
            </p>
          )}

          <button
            onClick={handleOpenPosition}
            disabled={proofState === "generating" || proofState === "submitting" || !walletAddress}
            className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40
              disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {proofState === "generating"
              ? "Generating ZK Proof…"
              : proofState === "submitting"
              ? "Submitting to Stellar…"
              : "Open Position"}
          </button>

          <p className="text-xs text-eclipse-muted text-center">
            Proof is generated in your browser. Private inputs never leave your device.
          </p>
        </div>
      )}
    </main>
  );
}

function InputRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-eclipse-border bg-eclipse-bg px-3 py-2
          text-eclipse-text focus:outline-none focus:border-violet-500"
      />
      {hint && <p className="text-xs text-eclipse-muted mt-1">{hint}</p>}
    </div>
  );
}
