"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Demo wallet (mock). Uses the testnet deployer address so it lines up with the
// on-chain tx signature. Connection is faked — no real wallet kit yet.
const DEMO_ADDRESS = "GCMQN373E772MJ2K3HC62UGX3USHBFHNKDCQCOVRBOBPOMAJHC242VBG";

type WalletValue = {
  address: string | null;
  balance: string | null;
  connecting: boolean;
  faucetLoading: boolean;
  faucetMessage: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  requestFaucet: () => Promise<void>;
};

const WalletContext = createContext<WalletValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);

  async function fetchBalance(addr: string) {
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${addr}`);
      if (res.ok) {
        const data = await res.json();
        const native = data.balances.find((b: any) => b.asset_type === "native");
        setBalance(
          native
            ? parseFloat(native.balance).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " XLM"
            : "0 XLM",
        );
      } else {
        setBalance("0 XLM (Unfunded)");
      }
    } catch (e) {
      console.error(e);
      setBalance("Error loading balance");
    }
  }

  async function connect() {
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 600));
    setAddress(DEMO_ADDRESS);
    await fetchBalance(DEMO_ADDRESS);
    setConnecting(false);
  }

  function disconnect() {
    setAddress(null);
    setBalance(null);
    setFaucetMessage(null);
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

  return (
    <WalletContext.Provider
      value={{ address, balance, connecting, faucetLoading, faucetMessage, connect, disconnect, requestFaucet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
