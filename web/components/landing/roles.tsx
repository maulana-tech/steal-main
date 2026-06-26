import { Coins, Zap, Eye, type LucideIcon } from "lucide-react";

export type RoleKey = "borrower" | "liquidator" | "auditor";

export const ROLES: {
  key: RoleKey;
  label: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    key: "borrower",
    label: "Borrow",
    title: "Borrower",
    desc: "Deposit collateral and borrow USDC against hidden amounts. A high credit score unlocks LTV above 100% — every number stays behind a commitment.",
    icon: Coins,
  },
  {
    key: "liquidator",
    label: "Liquidate",
    title: "Liquidator",
    desc: "Prove a position's health factor is below one and liquidate it — without ever seeing the borrower's actual numbers.",
    icon: Zap,
  },
  {
    key: "auditor",
    label: "Audit",
    title: "Auditor",
    desc: "Decrypt full positions with a view key. The public sees only commitments; you see exactly what you're authorized to.",
    icon: Eye,
  },
];
