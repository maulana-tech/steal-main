"use client";

import { useState } from "react";

interface PositionData {
  collateralCommitment: string;
  debtCommitment: string;
  creditAttestation: string;
  nullifier: string;
  collateral?: number;
  debt?: number;
  creditScore?: number;
  healthFactor?: number;
}

export default function PublicVsAuditorToggle({ position }: { position: PositionData }) {
  const [mode, setMode] = useState<"public" | "auditor">("public");
  const hasAuditor = position.collateral !== undefined;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {(["public", "auditor"] as const).map((tab) => {
          const active = mode === tab;
          const disabled = tab === "auditor" && !hasAuditor;
          return (
            <button
              key={tab}
              onClick={() => !disabled && setMode(tab)}
              disabled={disabled}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "none",
                border: "none",
                borderBottom: active
                  ? `2px solid ${tab === "public" ? "var(--accent)" : "var(--emerald)"}`
                  : "2px solid transparent",
                fontSize: 13,
                fontWeight: 600,
                color: active ? "var(--foreground)" : "var(--muted)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
                transition: "color 0.15s",
              }}
            >
              {tab === "public" ? "🌐 Public View" : "🔍 Auditor View"}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>
        {mode === "public" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Collateral" value={position.collateralCommitment} hidden />
            <Row label="Debt" value={position.debtCommitment} hidden />
            <Row label="Credit" value={position.creditAttestation} hidden />
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--accent)",
                fontStyle: "italic",
              }}
            >
              Actual values are cryptographically hidden. Zero-knowledge.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Collateral" value={`${position.collateral} XLM`} />
            <Row label="Debt" value={`${position.debt} USDC`} />
            <Row label="Credit Score" value={String(position.creditScore)} />
            <Row label="Health Factor" value={(position.healthFactor ?? 0).toFixed(4)} />
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--emerald)",
                fontStyle: "italic",
              }}
            >
              Decrypted via view key. Public is still blind.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{label}</span>
      <span
        className={hidden ? "" : "mono"}
        style={{
          fontSize: 12,
          color: hidden ? "var(--muted)" : "var(--foreground)",
          fontWeight: hidden ? 400 : 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
