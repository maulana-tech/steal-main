import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/ui/SectionReveal";

// Closing call-to-action. Sends visitors to the main app (/app) rather than
// embedding the interactive demo on the landing page.
export function CtaSection() {
  return (
    <section id="demo" className="mx-auto w-full max-w-4xl scroll-mt-24 px-6 py-24 sm:py-32">
      <SectionReveal>
        <div className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#a78bfa]">
            Live on testnet
          </span>
          <h2
            className="mx-auto mt-3 max-w-2xl text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Ready to borrow in the dark?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/55">
            Open the app to try all three roles — borrow privately, liquidate blindly, or
            audit with a view key. Running against Stellar testnet.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-full bg-[#7c3aed] px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Launch the app <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pay/create"
              className="rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
            >
              Send a payment
            </Link>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
