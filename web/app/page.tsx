import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 720,
          textAlign: "center",
        }}
      >
        {/* Eyebrow badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <span
            className="badge"
            style={{
              borderColor: "rgba(124,58,237,0.35)",
              color: "#a78bfa",
              background: "rgba(124,58,237,0.08)",
            }}
          >
            <span className="dot" style={{ background: "#7c3aed" }} />
            Stellar Hacks: Real-World ZK
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 80px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            marginBottom: 20,
            background: "linear-gradient(135deg, #ffffff 40%, #666666 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Eclipse
        </h1>

        <p
          style={{
            fontSize: 17,
            color: "var(--muted)",
            lineHeight: 1.7,
            maxWidth: 480,
            margin: "0 auto 40px",
          }}
        >
          Confidential lending on Stellar. Borrow against hidden collateral.
          Prove solvency without revealing a single number.
        </p>

        {/* Tech badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            marginBottom: 56,
          }}
        >
          {[
            { label: "Noir + UltraHonk", color: "#a78bfa" },
            { label: "ZK On-Chain", color: "#a78bfa" },
            { label: "Stellar Protocol 26", color: "#60a5fa" },
            { label: "View-Key Disclosure", color: "#34d399" },
          ].map(({ label, color }) => (
            <span
              key={label}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "var(--font-mono)",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.03)",
                color,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Role cards — pure CSS hover via className */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <RoleCard
            href="/borrower"
            icon="↓"
            title="Borrower"
            desc="Deposit collateral, prove credit, borrow USDC. Numbers stay hidden."
            cls="role-card-violet"
          />
          <RoleCard
            href="/liquidator"
            icon="⚡"
            title="Liquidator"
            desc="Prove a position is unhealthy without seeing the actual values."
            cls="role-card-amber"
          />
          <RoleCard
            href="/auditor"
            icon="◎"
            title="Auditor"
            desc="Enter a view key to decrypt any position in full detail."
            cls="role-card-emerald"
          />
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Testnet only · Proofs generated client-side · Private inputs never leave your device
        </p>
      </div>

      {/* Inject hover styles via a style tag */}
      <style>{`
        .role-card {
          display: block;
          text-align: left;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          text-decoration: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          height: 100%;
        }
        .role-card-violet:hover { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 32px rgba(124,58,237,0.12); }
        .role-card-amber:hover  { border-color: rgba(245,158,11,0.5);  box-shadow: 0 0 32px rgba(245,158,11,0.1); }
        .role-card-emerald:hover{ border-color: rgba(16,185,129,0.5);  box-shadow: 0 0 32px rgba(16,185,129,0.1); }
        .role-card-icon-violet { background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.2); color: #a78bfa; }
        .role-card-icon-amber  { background: rgba(245,158,11,0.1);  border: 1px solid rgba(245,158,11,0.2);  color: #f59e0b; }
        .role-card-icon-emerald{ background: rgba(16,185,129,0.1);  border: 1px solid rgba(16,185,129,0.2);  color: #10b981; }
      `}</style>
    </main>
  );
}

function RoleCard({
  href, icon, title, desc, cls,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  cls: string;
}) {
  const iconCls = cls.replace("role-card-", "role-card-icon-");
  return (
    <Link href={href} className={`role-card ${cls}`}>
      <div
        className={iconCls}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 16,
          fontFamily: "var(--font-mono)",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--foreground)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        {desc}
      </div>
    </Link>
  );
}
