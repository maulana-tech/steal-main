"use client";

import { useState } from "react";

interface PositionData {
  // Public (always shown)
  collateralCommitment: string;
  debtCommitment: string;
  creditAttestation: string;
  nullifier: string;
  // Private (only shown in auditor view)
  collateral?: number;
  debt?: number;
  creditScore?: number;
  healthFactor?: number;
}

interface Props {
  position: PositionData;
}

/**
 * Toggle between what the public sees (commitments only) vs
 * what an auditor sees (decrypted via view key).
 * Used to dramatically demonstrate the privacy contrast during the demo.
 */
export default function PublicVsAuditorToggle({ position }: Props) {
  const [showAuditor, setShowAuditor] = useState(false);
  const hasAuditorData = position.collateral !== undefined;

  return (
    <div className="rounded-xl border border-eclipse-border bg-eclipse-surface overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-eclipse-border">
        <button
          onClick={() => setShowAuditor(false)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            !showAuditor
              ? "bg-eclipse-bg text-eclipse-text border-b-2 border-violet-500"
              : "text-eclipse-muted hover:text-eclipse-text"
          }`}
        >
          🌐 Public View
        </button>
        <button
          onClick={() => setShowAuditor(true)}
          disabled={!hasAuditorData}
          className={`flex-1 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
            showAuditor
              ? "bg-eclipse-bg text-eclipse-text border-b-2 border-emerald-500"
              : "text-eclipse-muted hover:text-eclipse-text"
          }`}
        >
          🔍 Auditor View
        </button>
      </div>

      <div className="p-5 space-y-2 text-sm font-mono">
        {!showAuditor ? (
          <>
            <Field label="Collateral" value={position.collateralCommitment} hidden />
            <Field label="Debt" value={position.debtCommitment} hidden />
            <Field label="Credit" value={position.creditAttestation} hidden />
            <p className="text-xs text-violet-400 italic mt-2">
              Actual values are cryptographically hidden. Zero-knowledge.
            </p>
          </>
        ) : (
          <>
            <Field label="Collateral" value={`${position.collateral} XLM`} />
            <Field label="Debt" value={`${position.debt} USDC`} />
            <Field label="Credit Score" value={String(position.creditScore)} />
            <Field label="Health Factor" value={(position.healthFactor ?? 0).toFixed(4)} />
            <p className="text-xs text-emerald-400 italic mt-2">
              Decrypted via view key. Public is still blind.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  hidden = false,
}: {
  label: string;
  value: string;
  hidden?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-eclipse-muted flex-shrink-0">{label}:</span>
      <span
        className={`truncate text-xs ${
          hidden ? "text-eclipse-muted" : "text-eclipse-text font-semibold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
