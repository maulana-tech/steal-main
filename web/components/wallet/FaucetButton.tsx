"use client";

import { Droplets } from "lucide-react";
import { useWallet } from "./WalletProvider";

// One-click testnet XLM faucet. Auto-connects first if needed.
export function FaucetButton() {
  const { claimFaucet, faucetLoading } = useWallet();

  return (
    <button
      type="button"
      onClick={claimFaucet}
      disabled={faucetLoading}
      title="Claim testnet XLM to test the app"
      className="liquid-glass flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-60"
    >
      <Droplets className="h-4 w-4 text-sky-300" />
      {faucetLoading ? "Funding…" : "Faucet"}
    </button>
  );
}
