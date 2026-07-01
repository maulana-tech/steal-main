import { SectionReveal } from "@/components/ui/SectionReveal";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    n: "01",
    title: "Commit privately",
    body: "Deposit collateral and set a credit score. Only Poseidon commitments go on-chain — never the amounts.",
  },
  {
    n: "02",
    title: "Prove in your browser",
    body: "Generate a zero-knowledge proof that your position is healthy — locally, in WASM. Nothing sensitive leaves your device.",
  },
  {
    n: "03",
    title: "Borrow in the dark",
    body: "Draw USDC against your collateral. The chain sees a valid proof and a commitment — never how much.",
  },
  {
    n: "04",
    title: "Liquidate or audit blindly",
    body: "Liquidators prove a position's health factor is below one without seeing your numbers; auditors decrypt with a view key.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-24 sm:py-28">
      <SectionHeading
        eyebrow="How it works"
        title={<>Borrow without showing your hand.</>}
        subtitle="Four steps, from commitment to settlement — all confidential."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <SectionReveal key={s.n} delay={(i % 2) * 0.08}>
            <div className="liquid-glass h-full rounded-2xl p-7">
              <span
                className="text-4xl font-medium text-white/25"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {s.n}
              </span>
              <h3 className="mt-3 text-lg font-medium text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{s.body}</p>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
