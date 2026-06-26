"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { ROLE_TABS, RoleTabs, type RoleId, useRoleTab } from "./tabs";

const RoleLoading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/40">
    Loading the prover…
  </div>
);

// Each role view is code-split and rendered in "embedded" mode (no page header,
// no full-screen wrapper) so it sits cleanly inside the panel card.
const VIEWS: Record<RoleId, ComponentType<{ embedded?: boolean }>> = {
  borrower: dynamic(() => import("@/app/borrower/page"), { ssr: false, loading: RoleLoading }),
  liquidator: dynamic(() => import("@/app/liquidator/page"), { ssr: false, loading: RoleLoading }),
  auditor: dynamic(() => import("@/app/auditor/page"), { ssr: false, loading: RoleLoading }),
};

export function RolePanel() {
  const { active } = useRoleTab();
  const Active = VIEWS[active];
  const tab = ROLE_TABS.find((item) => item.id === active) ?? ROLE_TABS[0];

  return (
    <section id="app" className="w-full max-w-[600px]">
      {/* Conventional centered tab row above the panel. */}
      <RoleTabs vertical={false} className="mb-6 justify-center" />

      <p className="mb-3 text-center text-[15px] font-semibold text-white">{tab.lead}</p>

      <div className="liquid-glass relative z-30 rounded-2xl shadow-2xl">
        <Active embedded />
      </div>

      <p className="mt-4 text-center text-xs text-white/40">{tab.hint}</p>
    </section>
  );
}
