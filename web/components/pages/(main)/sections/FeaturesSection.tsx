import Link from "next/link";
import { Cpu, EyeOff, KeyRound, Send, ShieldCheck, Zap } from "lucide-react";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { SectionHeading } from "./SectionHeading";

const FEATURES = [
  {
    icon: EyeOff,
    title: "Hidden by default",
    body: "Collateral, debt, and credit scores live on-chain only as Poseidon commitments. The raw numbers never touch the ledger.",
  },
  {
    icon: ShieldCheck,
    title: "Proven, not revealed",
    body: "Zero-knowledge proofs (Noir + UltraHonk) attest a position is healthy — without exposing a single value.",
  },
  {
    icon: Cpu,
    title: "Client-side proving",
    body: "Every proof is generated in your browser via WASM. Private inputs never leave your device.",
  },
  {
    icon: KeyRound,
    title: "Auditable on demand",
    body: "Share a view key and an auditor can decrypt the full position. Nobody else can — not even the pool.",
  },
  {
    icon: Send,
    title: "Confidential payments",
    body: "Send USDC through a link or QR that hides the amount, sender, and receiver. Only a commitment is public.",
    href: "/pay/create",
  },
  {
    icon: Zap,
    title: "Settles on Soroban",
    body: "Proofs are verified on-chain on Stellar. Confidential, but fast and cheap to settle.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24 sm:py-28">
      <SectionHeading
        eyebrow="Why Steal"
        title={<>Privacy that actually settles on-chain.</>}
        subtitle="Confidential lending where the math is public and your numbers are not."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          const card = (
            <div className="liquid-glass group h-full rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Icon className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <h3 className="mt-5 text-lg font-medium text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{f.body}</p>
              {f.href ? (
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#a78bfa]">
                  Try it →
                </span>
              ) : null}
            </div>
          );
          return (
            <SectionReveal key={f.title} delay={(i % 3) * 0.08}>
              {f.href ? (
                <Link href={f.href} className="block h-full">
                  {card}
                </Link>
              ) : (
                card
              )}
            </SectionReveal>
          );
        })}
      </div>
    </section>
  );
}
