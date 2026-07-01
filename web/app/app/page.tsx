import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VideoBackground } from "@/components/ui/VideoBackground";
import { WalletButton } from "@/components/wallet/WalletButton";
import { NavMenu } from "@/components/pages/(main)/NavMenu";
import { RoleTabProvider } from "@/components/pages/(main)/tabs";
import { RolePanel } from "@/components/pages/(main)/RolePanel";

// The main application — the three confidential-lending roles. Reached from the
// landing page's CTAs.
export default function AppPage() {
  return (
    <div className="relative min-h-screen bg-black">
      <VideoBackground />

      <RoleTabProvider>
        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-black/30 px-6 py-4 backdrop-blur-md sm:px-10">
            <Link href="/" className="flex items-center gap-2 text-white/70 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              <img
                src="/logo/steal-logo-light.png"
                alt="Steal Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-lg font-semibold tracking-tight text-white">Steal</span>
            </Link>

            <div className="flex items-center gap-3">
              <WalletButton />
              <NavMenu />
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center px-6 py-10 sm:py-14">
            <div className="mb-8 text-center">
              <h1
                className="text-3xl font-medium tracking-tight text-white sm:text-4xl"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Confidential lending
              </h1>
              <p className="mt-2 text-sm text-white/55">
                Borrow privately · liquidate blindly · audit with a view key
              </p>
            </div>

            <RolePanel />
          </main>
        </div>
      </RoleTabProvider>
    </div>
  );
}
