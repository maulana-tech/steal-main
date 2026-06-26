"use client";

import { Wallet } from "lucide-react";
import { useWallet } from "./WalletProvider";

// Inline connect prompt for the role panels. Hidden once connected (the navbar
// WalletButton then shows the connected state). Keeps standalone /borrower etc.
// routes usable even without the navbar button.
export function WalletGate() {
  const { address, connect, connecting } = useWallet();
  if (address) return null;

  return (
    <button
      type="button"
      onClick={connect}
      disabled={connecting}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07] disabled:opacity-60"
    >
      <Wallet className="h-4 w-4" />
      {connecting ? "Connecting…" : "Connect Stellar Wallet"}
    </button>
  );
}
