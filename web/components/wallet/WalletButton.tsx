"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Wallet, ChevronDown, Droplets, Power } from "lucide-react";
import { useWallet } from "./WalletProvider";

export function WalletButton() {
  const { address, balance, connecting, faucetLoading, connect, disconnect, claimFaucet } = useWallet();
  const [open, setOpen] = useState(false);

  if (!address) {
    return (
      <button
        type="button"
        onClick={connect}
        disabled={connecting}
        className="liquid-glass flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="liquid-glass flex items-center gap-2 rounded-full py-2.5 pl-4 pr-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        <span className="font-mono">
          {address.slice(0, 4)}…{address.slice(-4)}
        </span>
        <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            {/* Click-away backdrop. */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="liquid-glass absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl p-4"
            >
              <p className="text-[11px] uppercase tracking-widest text-white/40">Connected account</p>
              <p className="mt-1 break-all font-mono text-xs text-white/80">{address}</p>

              <div className="my-3 h-px w-full bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Balance</span>
                <span className="font-mono text-sm font-semibold text-white">{balance ?? "Loading…"}</span>
              </div>

              <button
                type="button"
                onClick={claimFaucet}
                disabled={faucetLoading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/5 disabled:opacity-60"
              >
                <Droplets className="h-3.5 w-3.5" />
                {faucetLoading ? "Funding…" : "Friendbot faucet"}
              </button>

              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-medium text-white/50 transition-colors hover:text-white"
              >
                <Power className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
