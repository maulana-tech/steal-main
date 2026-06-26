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
  // Funds the account with testnet XLM via Friendbot. Auto-connects first if
  // the wallet isn't connected yet, so a user can claim before connecting.
  claimFaucet: () => Promise<void>;
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

  async function fundAddress(addr: string) {
    setFaucetLoading(true);
    setFaucetMessage(null);
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${addr}`);
      if (res.ok) {
        setFaucetMessage("Success! Funded 10,000 XLM — you're ready to test.");
      } else {
        // Friendbot returns 400 when the account already exists / is rate-limited.
        setFaucetMessage("Account already funded — balance refreshed.");
      }
      await fetchBalance(addr);
    } catch (e) {
      console.error(e);
      setFaucetMessage("Error connecting to Friendbot. Try again.");
    }
    setFaucetLoading(false);
    setTimeout(() => setFaucetMessage(null), 6000);
  }

  async function claimFaucet() {
    let addr = address;
    if (!addr) {
      setConnecting(true);
      await new Promise((r) => setTimeout(r, 400));
      addr = DEMO_ADDRESS;
      setAddress(addr);
      setConnecting(false);
    }
    await fundAddress(addr);
  }

  return (
    <WalletContext.Provider
      value={{ address, balance, connecting, faucetLoading, faucetMessage, connect, disconnect, claimFaucet }}
    >
      {children}

      {/* Global faucet feedback toast — visible regardless of which control fired it. */}
      {faucetMessage ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div
            className={`liquid-glass rounded-full px-5 py-2.5 text-sm font-medium ${
              faucetMessage.startsWith("Success") ? "text-emerald-300" : "text-white/80"
            }`}
          >
            {faucetMessage}
          </div>
        </div>
      ) : null}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
