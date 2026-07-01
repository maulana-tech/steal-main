import Link from "next/link";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Demo", href: "#demo" },
      { label: "Send a payment", href: "/pay/create" },
    ],
  },
  {
    title: "Roles",
    links: [
      { label: "Borrower", href: "/borrower" },
      { label: "Liquidator", href: "/liquidator" },
      { label: "Auditor", href: "/auditor" },
    ],
  },
  {
    title: "Stack",
    links: [
      { label: "Tech stack", href: "#tech" },
      { label: "Noir + UltraHonk", href: "#tech" },
      { label: "Soroban / Stellar", href: "#tech" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 px-6 pb-10 pt-16 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img
                src="/logo/steal-logo-light.png"
                alt="Steal Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-lg font-semibold tracking-tight text-white">Steal</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
              Confidential lending on Stellar. Proofs generated client-side; private inputs
              never leave your device.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
                {col.title}
              </h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-white/35">
          © 2026 Steal · Testnet only · Built for Stellar Hacks: Real-World ZK
        </div>
      </div>
    </footer>
  );
}
