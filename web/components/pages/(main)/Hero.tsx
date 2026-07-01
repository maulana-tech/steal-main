"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-medium text-white/70">
          Confidential lending on Stellar · Testnet
        </span>

        <h1
          className="max-w-3xl text-6xl font-medium leading-[1.05] tracking-tight text-white sm:text-8xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Borrow in the <em className="italic text-[#c4b5fd]">dark</em>.
        </h1>

        <p className="max-w-xl text-base leading-7 text-white/60 sm:text-lg">
          Collateral, debt, and credit scores stay hidden behind zero-knowledge proofs.
          Visible to no one but you.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Launch app
          </Link>
          <Link
            href="/pay/create"
            className="liquid-glass rounded-full px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            Send a payment
          </Link>
        </div>
      </motion.div>

      <a
        href="#features"
        aria-label="Scroll to features"
        className="absolute bottom-8 flex flex-col items-center gap-1 text-white/40 transition-colors hover:text-white/70"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </a>
    </section>
  );
}
