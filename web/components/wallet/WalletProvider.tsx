"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  StellarWalletsKit,
  Networks,
  KitEventType,
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";

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
  signTransaction: (xdr: string) => Promise<string>;
};

const WalletContext = createContext<WalletValue | null>(null);

let isKitInitialized = false;
function initKit() {
  if (typeof window === "undefined") return;
  if (isKitInitialized) return;

  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new LobstrModule(),
      new xBullModule(),
    ],
    network: Networks.TESTNET,
  });

  // Keep track of the selected wallet in localStorage
  StellarWalletsKit.on(KitEventType.WALLET_SELECTED, (event) => {
    if (event.payload.id) {
      localStorage.setItem("selectedWallet", event.payload.id);
    }
  });

  isKitInitialized = true;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);

  // Auto-connect saved wallet on mount
  useEffect(() => {
    initKit();
    const savedWallet = localStorage.getItem("selectedWallet");
    if (savedWallet) {
      try {
        StellarWalletsKit.setWallet(savedWallet);
        StellarWalletsKit.fetchAddress().then(({ address }) => {
          setAddress(address);
          fetchBalance(address);
        }).catch((e) => {
          console.error("Auto-connect failed:", e);
          localStorage.removeItem("selectedWallet");
        });
      } catch (e) {
        console.error("Error setting wallet:", e);
        localStorage.removeItem("selectedWallet");
      }
    }
  }, []);

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
    try {
      initKit();
      const res = await StellarWalletsKit.authModal();
      setAddress(res.address);
      await fetchBalance(res.address);
    } catch (e: any) {
      console.error("Failed to connect wallet:", e);
      // Code -1 is returned when the user closes the modal
      if (e?.code !== -1) {
        alert(e?.message || "Failed to connect wallet");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    try {
      await StellarWalletsKit.disconnect();
    } catch (e) {
      console.error("Failed to disconnect wallet:", e);
    }
    setAddress(null);
    setBalance(null);
    setFaucetMessage(null);
    localStorage.removeItem("selectedWallet");
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
      await connect();
      return;
    }
    await fundAddress(addr);
  }

  async function signTransaction(xdr: string): Promise<string> {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr);
    return signedTxXdr;
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        connecting,
        faucetLoading,
        faucetMessage,
        connect,
        disconnect,
        claimFaucet,
        signTransaction,
      }}
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
