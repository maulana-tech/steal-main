"use client";

import { useState } from "react";

interface DecryptedPosition {
  collateral: number;
  debt: number;
  creditScore: number;
  saltC: string;
  saltD: string;
  positionId: string;
  healthFactor: number;
}

export default function AuditorPage() {
  const [viewKey, setViewKey] = useState("");
  const [positionId, setPositionId] = useState("pos_001");
  const [decrypted, setDecrypted] = useState<DecryptedPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecrypt() {
    if (!viewKey || !positionId) return;

    setLoading(true);
    setError(null);

    try {
      // In production: fetch encrypted blob from the borrower's data store
      // (IPFS, encrypted event log, etc.) and decrypt with the view key.
      //
      // For demo: simulate decryption of a known position.
      await new Promise((r) => setTimeout(r, 1200));

      // STUB: simulated decrypted values
      if (viewKey.startsWith("vk_") && positionId === "pos_001") {
        setDecrypted({
          collateral: 1000,
          debt: 750,
          creditScore: 720,
          saltC: "0x9f3a2b...",
          saltD: "0x1c4e5d...",
          positionId: "pos_001",
          healthFactor: 1000 * 0.1 / 750, // collateral_usd / debt
        });
      } else {
        setError("Invalid view key or position not found.");
      }
    } catch (err) {
      setError("Decryption failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">
        <span className="text-emerald-400">Auditor</span> View
      </h1>
      <p className="text-eclipse-muted mb-8 text-sm">
        Enter the borrower's view key to decrypt their position details.
        The public on-chain state only shows cryptographic commitments.
      </p>

      {/* Public view reminder */}
      <div className="rounded-xl border border-eclipse-border bg-eclipse-surface p-5 mb-8">
        <h2 className="text-sm font-semibold text-eclipse-muted uppercase tracking-wider mb-3">
          Public On-Chain State (what everyone sees)
        </h2>
        <div className="space-y-2 font-mono text-xs text-eclipse-muted">
          <p>Position ID: <span className="text-eclipse-text">pos_001</span></p>
          <p>Collateral Commitment: <span className="text-eclipse-text">0xdeadbeef...a1</span></p>
          <p>Debt Commitment: <span className="text-eclipse-text">0xfeedface...b2</span></p>
          <p>Credit Attestation: <span className="text-eclipse-text">0x99aabb...cc</span></p>
          <p className="text-violet-400 italic mt-2">← Actual amounts: completely hidden</p>
        </div>
      </div>

      {/* View key input */}
      <div className="rounded-xl border border-eclipse-border bg-eclipse-surface p-6 space-y-4">
        <h2 className="text-sm font-semibold text-eclipse-muted uppercase tracking-wider">
          Decrypt with View Key
        </h2>

        <div>
          <label className="block text-sm font-medium mb-1">Position ID</label>
          <input
            type="text"
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="w-full rounded-lg border border-eclipse-border bg-eclipse-bg px-3 py-2
              font-mono text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">View Key</label>
          <input
            type="text"
            value={viewKey}
            onChange={(e) => setViewKey(e.target.value)}
            placeholder="vk_... (shared by borrower)"
            className="w-full rounded-lg border border-eclipse-border bg-eclipse-bg px-3 py-2
              font-mono text-sm focus:outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-eclipse-muted mt-1">
            Demo: try <code className="text-emerald-400">vk_demo123</code> for pos_001
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleDecrypt}
          disabled={loading || !viewKey}
          className="w-full py-3 rounded-lg bg-emerald-700 hover:bg-emerald-600
            disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {loading ? "Decrypting…" : "Decrypt Position"}
        </button>
      </div>

      {/* Decrypted result */}
      {decrypted && (
        <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/30 p-6">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">
            🔓 Decrypted Position — Full Detail
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="Collateral" value={`${decrypted.collateral} XLM`} />
            <Row label="Debt" value={`${decrypted.debt} USDC`} />
            <Row label="Credit Score" value={String(decrypted.creditScore)} />
            <Row label="Health Factor" value={decrypted.healthFactor.toFixed(4)} />
            <Row label="Salt C" value={decrypted.saltC} mono />
            <Row label="Salt D" value={decrypted.saltD} mono />
          </div>
          <p className="mt-4 text-xs text-eclipse-muted">
            Public remains blind. Only this view key holder can see these values.
          </p>
        </div>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-eclipse-muted">{label}</span>
      <span className={`text-eclipse-text ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
