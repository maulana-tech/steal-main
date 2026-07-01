"use client";

export type ProofState = "idle" | "generating" | "submitting" | "success" | "error";

const CONFIG: Record<
  Exclude<ProofState, "idle">,
  { icon: string; label: string; sub?: string; bg: string; color: string; border: string }
> = {
  generating: {
    icon: "⚙",
    label: "Generating ZK proof in browser…",
    sub: "Running in your browser (~10–30s). Private inputs never leave your device.",
    bg: "rgba(124,58,237,0.06)",
    color: "#a78bfa",
    border: "rgba(124,58,237,0.2)",
  },
  submitting: {
    icon: "↑",
    label: "Submitting to Stellar testnet…",
    bg: "rgba(96,165,250,0.06)",
    color: "#60a5fa",
    border: "rgba(96,165,250,0.2)",
  },
  success: {
    icon: "✓",
    label: "Proof verified on-chain.",
    sub: "Transaction confirmed on Stellar testnet.",
    bg: "rgba(34,197,94,0.06)",
    color: "#22c55e",
    border: "rgba(34,197,94,0.2)",
  },
  error: {
    icon: "✕",
    label: "Failed.",
    sub: "Proof generation or submission failed. Check the console.",
    bg: "rgba(239,68,68,0.06)",
    color: "#ef4444",
    border: "rgba(239,68,68,0.2)",
  },
};

export default function ProofStatus({ state }: { state: ProofState }) {
  if (state === "idle") return null;
  const c = CONFIG[state];

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 8,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          color: c.color,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {c.icon}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{c.label}</div>
        {c.sub && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{c.sub}</div>
        )}
      </div>
    </div>
  );
}
