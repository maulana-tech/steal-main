"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Menu, X, Globe, MessageCircle } from "lucide-react";
import { FaucetButton } from "@/components/wallet/FaucetButton";

// Collapses Docs / socials behind a hamburger. Opens on hover or click; the
// items expand (max-width) and slide in to the left of the button for a smooth
// drawer-along-the-navbar feel — same pattern as the reference.
export function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="menu"
            initial={{ maxWidth: 0, opacity: 0 }}
            animate={{ maxWidth: 480, opacity: 1 }}
            exit={{ maxWidth: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center overflow-hidden"
          >
            <div className="flex items-center gap-3 pr-3">
              <FaucetButton />
              <a
                href="#how"
                className="whitespace-nowrap text-sm font-medium text-white/80 hover:text-white"
              >
                Docs
              </a>
              <a
                href="#"
                aria-label="Discord"
                className="liquid-glass rounded-full p-2 text-white/80 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Website"
                className="liquid-glass rounded-full p-2 text-white/80 hover:text-white"
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
