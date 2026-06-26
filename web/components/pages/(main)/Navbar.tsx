import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { NavMenu } from "./NavMenu";

export function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center gap-3">
        <img
          src="/logo/steal-logo-light.png"
          alt="Steal Logo"
          className="h-8 w-auto object-contain"
        />
        <span className="text-xl font-semibold tracking-tight text-white">Steal</span>
      </Link>

      <div className="flex items-center gap-3">
        <WalletButton />
        <NavMenu />
      </div>
    </header>
  );
}
