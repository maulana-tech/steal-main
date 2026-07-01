import { Boxes, Braces, CircleDot, FileCode2, Layers, Lock, ScanLine, Zap } from "lucide-react";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { SectionHeading } from "./SectionHeading";

const STACK = [
  { icon: FileCode2, name: "Noir", note: "ZK circuits" },
  { icon: ScanLine, name: "Barretenberg", note: "UltraHonk proving" },
  { icon: Lock, name: "Poseidon2", note: "Commitments & nullifiers" },
  { icon: Boxes, name: "Soroban", note: "Smart contracts" },
  { icon: Zap, name: "Stellar", note: "Settlement layer" },
  { icon: Layers, name: "Next.js", note: "App Router frontend" },
  { icon: CircleDot, name: "Rust", note: "Contract language" },
  { icon: Braces, name: "TypeScript", note: "SDK & crypto libs" },
];

export function TechStackSection() {
  return (
    <section id="tech" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-24 sm:py-28">
      <SectionHeading
        eyebrow="Built with"
        title={<>A zero-knowledge stack, end to end.</>}
        subtitle="Proven in Noir, verified on Soroban, driven from the browser."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {STACK.map((t, i) => {
          const Icon = t.icon;
          return (
            <SectionReveal key={t.name} delay={(i % 4) * 0.06}>
              <div className="liquid-glass flex h-full items-center gap-3 rounded-2xl px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Icon className="h-5 w-5 text-[#a78bfa]" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{t.name}</div>
                  <div className="truncate text-xs text-white/45">{t.note}</div>
                </div>
              </div>
            </SectionReveal>
          );
        })}
      </div>
    </section>
  );
}
