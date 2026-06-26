import Link from "next/link";
import { Eclipse } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { NavMenu } from "./NavMenu";

export function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center gap-2">
        <Eclipse className="h-7 w-7 text-white" />
        <span className="text-xl font-semibold tracking-tight text-white">Eclipse</span>
      </Link>

      <div className="flex items-center gap-3">
        <WalletButton />
        <NavMenu />
      </div>
    </header>
  );
}
