"use client";

interface Props {
  healthFactor: number;
}

export default function HealthFactorMeter({ healthFactor }: Props) {
  const capped = Math.min(healthFactor, 3);
  const pct = (capped / 3) * 100;

  const { color, glow, label } =
    healthFactor < 1
      ? { color: "var(--red)", glow: "var(--red-glow)", label: "Liquidatable" }
      : healthFactor < 1.5
      ? { color: "var(--amber)", glow: "var(--amber-glow)", label: "At Risk" }
      : { color: "var(--green)", glow: "var(--emerald-glow)", label: "Healthy" };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="label">Health Factor</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color,
            }}
          >
            {isFinite(healthFactor) ? healthFactor.toFixed(2) : "∞"}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 4,
              background: glow,
              color,
              border: `1px solid ${color}44`,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Track */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 3,
            background: color,
            boxShadow: `0 0 8px ${glow}`,
            transition: "width 0.4s ease, background 0.3s",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        <span>0</span>
        <span style={{ color: "var(--red)" }}>1.0 liq.</span>
        <span>3+</span>
      </div>
    </div>
  );
}
