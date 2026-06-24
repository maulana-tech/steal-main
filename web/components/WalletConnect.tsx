"use client";

import { useState } from "react";

interface Props {
  onConnect: (address: string) => void;
}

/**
 * WalletConnect — integrates Stellar Wallets Kit.
 *
 * [STUB] For MVP we simulate a connection. Replace with:
 *   import { StellarWalletsKit, WalletNetwork } from "@creit.tech/stellar-wallets-kit";
 *   const kit = new StellarWalletsKit({ network: WalletNetwork.TESTNET, ... });
 *   await kit.openModal({ onWalletSelected: async (option) => { ... } });
 */
export default function WalletConnect({ onConnect }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function connect() {
    setLoading(true);
    // STUB: generate a random demo address
    await new Promise((r) => setTimeout(r, 800));
    const demoAddr = "G" + Math.random().toString(36).slice(2).toUpperCase().padEnd(55, "A");
    setAddress(demoAddr);
    onConnect(demoAddr);
    setLoading(false);
  }

  function disconnect() {
    setAddress(null);
  }

  if (address) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-eclipse-border
        bg-eclipse-surface px-4 py-3">
        <div>
          <p className="text-xs text-eclipse-muted">Connected wallet</p>
          <p className="font-mono text-sm text-eclipse-text truncate max-w-xs">
            {address.slice(0, 8)}…{address.slice(-8)}
          </p>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-eclipse-muted hover:text-eclipse-text transition-colors"
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
      className="w-full py-3 rounded-xl border border-eclipse-border bg-eclipse-surface
        hover:border-violet-500 font-semibold transition-all disabled:opacity-40"
    >
      {loading ? "Connecting…" : "Connect Stellar Wallet"}
    </button>
  );
}
