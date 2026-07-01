"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function OraclePriceSlider({ value, onChange }: Props) {
  const usd = value / 1_000_000;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span className="label">XLM/USD Price Feed</span>
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(245,158,11,0.1)",
              color: "var(--amber)",
              border: "1px solid rgba(245,158,11,0.2)",
              fontFamily: "var(--font-mono)",
            }}
          >
            STUB
          </span>
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: "var(--foreground)",
          }}
        >
          ${usd.toFixed(4)}
        </span>
      </div>

      <input
        type="range"
        min={10_000}
        max={1_000_000}
        step={5_000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 11,
          color: "var(--muted)",
        }}
      >
        <span>$0.01</span>
        <span style={{ color: "var(--amber)" }}>↓ drop to trigger liquidation</span>
        <span>$1.00</span>
      </div>
    </div>
  );
}
