"use client";

import { useState } from "react";

interface Props {
  onConnect: (address: string) => void;
}

export default function WalletConnect({ onConnect }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function connect() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const demo = "G" + Math.random().toString(36).slice(2).toUpperCase().padEnd(55, "A");
    setAddress(demo);
    onConnect(demo);
    setLoading(false);
  }

  if (address) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="dot"
            style={{ background: "var(--emerald)", boxShadow: "0 0 6px var(--emerald-glow)" }}
          />
          <div>
            <div className="label" style={{ marginBottom: 2 }}>Connected</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--foreground)" }}>
              {address.slice(0, 6)}…{address.slice(-6)}
            </div>
          </div>
        </div>
        <button
          onClick={() => setAddress(null)}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={loading}
      className="btn btn-ghost"
      style={{ fontSize: 14 }}
    >
      {loading ? (
        <>
          <Spinner /> Connecting…
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
          Connect Stellar Wallet
        </>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}
