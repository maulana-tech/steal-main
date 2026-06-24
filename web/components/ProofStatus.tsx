"use client";

export type ProofState = "idle" | "generating" | "submitting" | "success" | "error";

interface Props {
  state: ProofState;
}

const STATE_CONFIG: Record<ProofState, { icon: string; label: string; color: string } | null> = {
  idle: null,
  generating: {
    icon: "⚙️",
    label: "Generating ZK proof in browser (WASM)… This may take 10–30 seconds.",
    color: "border-violet-700 bg-violet-950/30 text-violet-300",
  },
  submitting: {
    icon: "📡",
    label: "Submitting proof to Stellar testnet…",
    color: "border-blue-700 bg-blue-950/30 text-blue-300",
  },
  success: {
    icon: "✅",
    label: "Proof verified on-chain. Transaction confirmed.",
    color: "border-green-700 bg-green-950/30 text-green-300",
  },
  error: {
    icon: "❌",
    label: "Proof generation or submission failed. Check console for details.",
    color: "border-red-700 bg-red-950/30 text-red-300",
  },
};

export default function ProofStatus({ state }: Props) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${config.color}`}>
      <span className="text-xl flex-shrink-0">{config.icon}</span>
      <p>{config.label}</p>
    </div>
  );
}
