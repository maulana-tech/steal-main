"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { ArrowRight } from "lucide-react";
import { ROLES, type RoleKey } from "./roles";

const RoleLoading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/40">
    Loading the prover…
  </div>
);

// Each role view is code-split and only fetched when its tab is launched,
// so the marketing page stays light until the user opts into the app.
const PANELS: Record<RoleKey, ComponentType> = {
  borrower: dynamic(() => import("@/app/borrower/page"), { ssr: false, loading: RoleLoading }),
  liquidator: dynamic(() => import("@/app/liquidator/page"), { ssr: false, loading: RoleLoading }),
  auditor: dynamic(() => import("@/app/auditor/page"), { ssr: false, loading: RoleLoading }),
};

export default function AppTabs({
  role,
  launched,
  onSelectRole,
}: {
  role: RoleKey;
  launched: boolean;
  onSelectRole: (r: RoleKey) => void;
}) {
  const Active = PANELS[role];

  return (
    <section id="app" className="relative overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between md:mb-16">
          <h2 className="text-3xl tracking-tight text-white md:text-5xl">Launch the app</h2>
          <span className="hidden text-sm text-white/40 md:block">Three roles, one page</span>
        </div>

        {/* Liquid-glass role cards double as tabs */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = launched && r.key === role;
            return (
              <button
                key={r.key}
                onClick={() => onSelectRole(r.key)}
                aria-pressed={active}
                className={`liquid-glass rounded-3xl p-6 text-left transition-all md:p-8 ${
                  active ? "bg-white/[0.06] ring-1 ring-white/30" : "hover:bg-white/5"
                }`}
              >
                <span className="liquid-glass mb-5 inline-flex rounded-full p-3">
                  <Icon className={`h-5 w-5 ${active ? "text-white" : "text-white/70"}`} />
                </span>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-white/40">{r.label}</span>
                  <ArrowRight
                    className={`h-4 w-4 transition-colors ${active ? "text-white" : "text-white/30"}`}
                  />
                </div>
                <h3 className="mb-2 text-xl tracking-tight text-white md:text-2xl">{r.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{r.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Active role panel — single page, client-side switch (no navigation) */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-black md:mt-14">
          {launched ? (
            <Active />
          ) : (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 py-20 text-center">
              <p className="text-lg text-white/80">Pick a role to launch the app</p>
              <p className="max-w-sm text-sm text-white/40">
                Everything runs on this page — switching roles is instant, no reload.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
