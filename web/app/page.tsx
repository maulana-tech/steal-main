import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          🌑 <span className="text-violet-400">Eclipse</span>
        </h1>
        <p className="text-xl text-eclipse-muted max-w-xl">
          Confidential credit on Stellar. Borrow against hidden collateral.
          Prove solvency without revealing a single number.
        </p>
      </div>

      {/* ZK badge row */}
      <div className="flex gap-3 mb-12 flex-wrap justify-center text-sm">
        {["ZK Verified On-Chain", "Noir + UltraHonk", "Stellar Protocol 26", "View-Key Disclosure"].map(
          (badge) => (
            <span
              key={badge}
              className="px-3 py-1 rounded-full border border-eclipse-border bg-eclipse-surface text-eclipse-muted"
            >
              {badge}
            </span>
          )
        )}
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        <RoleCard
          href="/borrower"
          emoji="🏦"
          title="Borrower"
          description="Deposit collateral, generate a ZK proof, borrow USDC. Your numbers stay private."
          color="violet"
        />
        <RoleCard
          href="/liquidator"
          emoji="⚡"
          title="Liquidator"
          description="Prove a position is unhealthy without knowing the exact values. Execute fair liquidations."
          color="amber"
        />
        <RoleCard
          href="/auditor"
          emoji="🔍"
          title="Auditor"
          description="Enter a view key to decrypt and inspect any position in full detail."
          color="emerald"
        />
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-eclipse-muted">
        Built for Stellar Hacks: Real-World ZK — testnet only
      </p>
    </main>
  );
}

function RoleCard({
  href,
  emoji,
  title,
  description,
  color,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  color: "violet" | "amber" | "emerald";
}) {
  const borderColor = {
    violet: "hover:border-violet-500",
    amber: "hover:border-amber-500",
    emerald: "hover:border-emerald-500",
  }[color];

  const textColor = {
    violet: "text-violet-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  }[color];

  return (
    <Link href={href}>
      <div
        className={`rounded-xl border border-eclipse-border bg-eclipse-surface p-6 text-left
          transition-all duration-200 cursor-pointer hover:shadow-lg ${borderColor}`}
      >
        <div className="text-3xl mb-3">{emoji}</div>
        <h2 className={`text-lg font-semibold mb-2 ${textColor}`}>{title}</h2>
        <p className="text-sm text-eclipse-muted leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}
