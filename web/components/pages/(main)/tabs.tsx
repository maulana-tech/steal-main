"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export const ROLE_TABS = [
  {
    id: "borrower",
    label: "Borrower",
    lead: "Borrow privately",
    hint: "Deposit collateral and borrow USDC with every amount hidden behind a commitment.",
  },
  {
    id: "liquidator",
    label: "Liquidator",
    lead: "Liquidate blindly",
    hint: "Prove a position's health factor is below one — without seeing the borrower's numbers.",
  },
  {
    id: "auditor",
    label: "Auditor",
    lead: "Audit with a view key",
    hint: "Decrypt full positions with a shared view key. The public sees only commitments.",
  },
] as const;

export type RoleId = (typeof ROLE_TABS)[number]["id"];

type RoleTabValue = {
  active: RoleId;
  setActive: (id: RoleId) => void;
};

const RoleTabContext = createContext<RoleTabValue | null>(null);

// Lifts the active-role state so the left rail (aligned with the logo) and the
// panel content stay in sync while living in separate parts of the tree.
export function RoleTabProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<RoleId>("borrower");
  return (
    <RoleTabContext.Provider value={{ active, setActive }}>
      {children}
    </RoleTabContext.Provider>
  );
}

export function useRoleTab(): RoleTabValue {
  const ctx = useContext(RoleTabContext);
  if (!ctx) {
    throw new Error("useRoleTab must be used within a RoleTabProvider");
  }
  return ctx;
}

// A backgroundless list of tabs. The active item is marked by a small dot at
// its left edge (no bars/backgrounds). `vertical` is the left-rail look;
// horizontal is the stacked-on-top mobile look.
export function RoleTabs({
  vertical = true,
  className = "",
}: {
  vertical?: boolean;
  className?: string;
}) {
  const { active, setActive } = useRoleTab();
  return (
    <nav
      className={`flex ${
        vertical ? "flex-col gap-2" : "flex-row flex-wrap gap-x-6 gap-y-2"
      } ${className}`}
    >
      {ROLE_TABS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`relative cursor-pointer py-1 pl-4 text-left text-[15px] font-medium transition-colors ${
              isActive ? "text-white" : "text-white/40 hover:text-white"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white transition-opacity duration-200 ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
