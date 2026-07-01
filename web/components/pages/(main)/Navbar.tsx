import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { NavMenu } from "./NavMenu";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#tech", label: "Tech" },
  { href: "#demo", label: "Demo" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-black/30 px-6 py-4 backdrop-blur-md sm:px-10">
      <Link href="/" className="flex items-center gap-3">
        <img
          src="/logo/steal-logo-light.png"
          alt="Steal Logo"
          className="h-8 w-auto object-contain"
        />
        <span className="text-xl font-semibold tracking-tight text-white">Steal</span>
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-white/55 transition-colors hover:text-white"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <WalletButton />
        <NavMenu />
      </div>
    </header>
  );
}
