"use client";

import { useState } from "react";

interface Decrypted {
  collateral: number;
  debt: number;
  creditScore: number;
  saltC: string;
  saltD: string;
  healthFactor: number;
}

export default function AuditorPage() {
  const [viewKey, setViewKey] = useState("");
  const [posId, setPosId] = useState("pos_001");
  const [decrypted, setDecrypted] = useState<Decrypted | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decrypt() {
    setLoading(true);
    setError(null);
    setDecrypted(null);
    await new Promise((r) => setTimeout(r, 900));
    if (viewKey.startsWith("vk_") && posId === "pos_001") {
      setDecrypted({
        collateral: 1000,
        debt: 750,
        creditScore: 720,
        saltC: "0x9f3a2b4c…",
        saltD: "0x1c4e5d6f…",
        healthFactor: (1000 * 0.1) / 750,
      });
    } else {
      setError("Invalid view key or position not found.");
    }
    setLoading(false);
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
            background: "rgba(16,185,129,0.1)",
            color: "var(--emerald)",
            border: "1px solid rgba(16,185,129,0.2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Auditor
        </span>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Audit Position
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
          Enter a view key shared by the borrower to decrypt their position.
          The public on-chain state only shows commitments.
        </p>

        {/* Public state */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 14 }}>Public On-Chain State</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { k: "Position ID", v: "pos_001" },
              { k: "Collateral", v: "0xdeadbeef9f3a…" },
              { k: "Debt", v: "0xfeedface1c2d…" },
              { k: "Credit Attestation", v: "0x99aabb3f4e5d…" },
            ].map(({ k, v }) => (
              <div
                key={k}
                style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{k}</span>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: "#444", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--accent)",
              fontStyle: "italic",
            }}
          >
            Actual amounts completely hidden to the public
          </div>
        </div>

        {/* View key input */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 16 }}>Decrypt with View Key</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                Position ID
              </label>
              <input
                className="input"
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                View Key
              </label>
              <input
                className="input"
                value={viewKey}
                onChange={(e) => setViewKey(e.target.value)}
                placeholder="vk_…"
              />
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
                Demo: try{" "}
                <code
                  style={{
                    color: "var(--emerald)",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                  }}
                  onClick={() => setViewKey("vk_demo123")}
                >
                  vk_demo123
                </code>{" "}
                for pos_001
              </div>
            </div>

            {error && (
              <div
                style={{
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
              className="btn btn-emerald"
              onClick={decrypt}
              disabled={loading || !viewKey}
            >
              {loading ? "Decrypting…" : "Decrypt Position"}
            </button>
          </div>
        </div>

        {/* Decrypted result */}
        {decrypted && (
          <div
            className="card"
            style={{
              borderColor: "rgba(16,185,129,0.25)",
              background: "rgba(16,185,129,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                className="dot"
                style={{ background: "var(--emerald)", boxShadow: "0 0 6px var(--emerald-glow)" }}
              />
              <span className="label" style={{ color: "var(--emerald)" }}>
                Decrypted — Full Detail
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Collateral", value: `${decrypted.collateral} XLM`, mono: false },
                { label: "Debt", value: `${decrypted.debt} USDC`, mono: false },
                { label: "Credit Score", value: String(decrypted.creditScore), mono: false },
                {
                  label: "Health Factor",
                  value: decrypted.healthFactor.toFixed(4),
                  mono: true,
                  color:
                    decrypted.healthFactor < 1
                      ? "var(--red)"
                      : decrypted.healthFactor < 1.5
                      ? "var(--amber)"
                      : "var(--green)",
                },
                { label: "Salt C", value: decrypted.saltC, mono: true },
                { label: "Salt D", value: decrypted.saltD, mono: true },
              ].map(({ label, value, mono, color }) => (
                <div
                  key={label}
                  style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
                >
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: mono ? "var(--font-mono)" : undefined,
                      color: color ?? "var(--foreground)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: "8px 12px",
                background: "rgba(16,185,129,0.06)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--muted)",
                border: "1px solid rgba(16,185,129,0.1)",
              }}
            >
              Only this view key holder can see these values. The public sees only commitments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
