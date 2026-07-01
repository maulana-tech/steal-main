import { SectionReveal } from "@/components/ui/SectionReveal";

// Consistent eyebrow + serif title + subtitle used at the top of each section.
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <SectionReveal className="mx-auto mb-14 max-w-2xl text-center">
      <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#a78bfa]">
        {eyebrow}
      </span>
      <h2
        className="mt-3 text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/55">{subtitle}</p>
      ) : null}
    </SectionReveal>
  );
}
