"use client";

import { useState } from "react";

interface Props {
  onConnect: (address: string) => void;
}

export default function WalletConnect({ onConnect }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);

  async function fetchBalance(addr: string) {
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${addr}`);
      if (res.ok) {
        const data = await res.json();
        const nativeBal = data.balances.find((b: any) => b.asset_type === "native");
        if (nativeBal) {
          setBalance(parseFloat(nativeBal.balance).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " XLM");
        }
      } else {
        setBalance("0 XLM (Unfunded)");
      }
    } catch (e) {
      console.error(e);
      setBalance("Error loading balance");
    }
  }

  async function connect() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    // Use the actual testnet deployer address so it aligns with on-chain tx signature
    const demo = "GCMQN373E772MJ2K3HC62UGX3USHBFHNKDCQCOVRBOBPOMAJHC242VBG";
    setAddress(demo);
    onConnect(demo);
    await fetchBalance(demo);
    setLoading(false);
  }

  async function requestFaucet() {
    if (!address) return;
    setFaucetLoading(true);
    setFaucetMessage(null);
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${address}`);
      if (res.ok) {
        setFaucetMessage("Success! Funded 10k XLM.");
        await fetchBalance(address);
      } else {
        setFaucetMessage("Faucet failed. Try again.");
      }
    } catch (e) {
      console.error(e);
      setFaucetMessage("Error connecting to Friendbot.");
    }
    setFaucetLoading(false);
    setTimeout(() => setFaucetMessage(null), 5000);
  }

  if (address) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="dot"
              style={{ background: "var(--emerald)", boxShadow: "0 0 6px var(--emerald-glow)" }}
            />
            <div>
              <div className="label" style={{ marginBottom: 2 }}>Connected Account</div>
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div>
            <div className="label" style={{ marginBottom: 2 }}>Wallet Balance</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
              {balance ?? "Loading..."}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              onClick={requestFaucet}
              disabled={faucetLoading}
              className="btn btn-ghost"
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderColor: "rgba(124,58,237,0.3)",
                color: "#a78bfa",
                background: "rgba(124,58,237,0.05)",
              }}
            >
              {faucetLoading ? "Funding..." : "⚡ Friendbot Faucet"}
            </button>
            {faucetMessage && (
              <span style={{ fontSize: 10, color: faucetMessage.includes("Success") ? "var(--green)" : "var(--red)" }}>
                {faucetMessage}
              </span>
            )}
          </div>
        </div>
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
