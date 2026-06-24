"use client";

interface Props {
  value: number;   // price scaled 1e6
  onChange: (v: number) => void;
}

/**
 * Oracle price slider for demo purposes.
 * Simulates dropping XLM price to trigger liquidations.
 *
 * Range: $0.01 – $1.00 (10_000 – 1_000_000 scaled 1e6)
 * [HONEST STUB] Real oracle is manually set by admin.
 */
export default function OraclePriceSlider({ value, onChange }: Props) {
  const usdPrice = value / 1_000_000;

  return (
    <div className="rounded-xl border border-eclipse-border bg-eclipse-surface p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-eclipse-muted uppercase tracking-wider">
          Oracle Price — XLM/USD
          <span className="ml-2 text-xs font-normal text-eclipse-muted">[DEMO STUB]</span>
        </h3>
        <span className="font-mono font-bold text-lg text-eclipse-text">
          ${usdPrice.toFixed(4)}
        </span>
      </div>

      <input
        type="range"
        min={10_000}
        max={1_000_000}
        step={1_000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />

      <div className="flex justify-between text-xs text-eclipse-muted mt-1">
        <span>$0.01</span>
        <span className="text-amber-400">↓ drop to trigger liquidation</span>
        <span>$1.00</span>
      </div>
    </div>
  );
}
