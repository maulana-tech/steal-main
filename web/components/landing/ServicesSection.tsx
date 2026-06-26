"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const viewport = { once: true, margin: "-100px" } as const;

const CARDS = [
  {
    href: "/borrower",
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4",
    tag: "Borrow",
    title: "Open a position",
    desc: "Deposit collateral and borrow USDC against it. A high credit score unlocks LTV above 100% — and every amount stays hidden behind a commitment.",
  },
  {
    href: "/liquidator",
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4",
    tag: "Liquidate",
    title: "Prove & liquidate",
    desc: "Spot an unhealthy position and prove its health factor is below one — without ever seeing the borrower's actual numbers.",
  },
];

export default function ServicesSection() {
  return (
    <section className="relative overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.7 }}
          className="mb-12 flex items-center justify-between md:mb-16"
        >
          <h2 className="text-3xl tracking-tight text-white md:text-5xl">What you can do</h2>
          <span className="hidden text-sm text-white/40 md:block">Three roles, one protocol</span>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.tag}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.8, delay: i * 0.15 }}
              className="group liquid-glass overflow-hidden rounded-3xl"
            >
              <Link href={card.href} className="block">
                <div className="relative aspect-video overflow-hidden">
                  <video
                    src={card.video}
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-white/40">
                      {card.tag}
                    </span>
                    <span className="liquid-glass rounded-full p-2">
                      <ArrowUpRight className="h-4 w-4 text-white" />
                    </span>
                  </div>
                  <h3 className="mb-3 text-xl tracking-tight text-white md:text-2xl">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/50">{card.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
