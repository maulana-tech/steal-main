"use client";

interface Props {
  healthFactor: number; // e.g. 1.5
}

/**
 * Visual health factor meter — shows how close a position is to liquidation.
 * HF < 1 = liquidatable (red), HF 1–1.5 = warning (yellow), HF > 1.5 = safe (green).
 */
export default function HealthFactorMeter({ healthFactor }: Props) {
  const capped = Math.min(healthFactor, 3); // cap at 3x for display
  const pct = (capped / 3) * 100;

  const color =
    healthFactor < 1
      ? { bar: "bg-red-500", text: "text-red-400", label: "LIQUIDATABLE" }
      : healthFactor < 1.5
      ? { bar: "bg-amber-400", text: "text-amber-400", label: "At Risk" }
      : { bar: "bg-green-500", text: "text-green-400", label: "Healthy" };

  return (
    <div className="rounded-xl border border-eclipse-border bg-eclipse-surface p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-eclipse-muted uppercase tracking-wider">
          Health Factor
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold font-mono ${color.text}`}>
            {isFinite(healthFactor) ? healthFactor.toFixed(2) : "∞"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${color.text} bg-current/10`}>
            {color.label}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-3 rounded-full bg-eclipse-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-eclipse-muted mt-1">
        <span>0</span>
        <span className="text-red-400">1.0 (liq.)</span>
        <span>3+</span>
      </div>
    </div>
  );
}
