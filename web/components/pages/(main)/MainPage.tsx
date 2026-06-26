import { VideoBackground } from "@/components/ui/VideoBackground";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Navbar } from "./Navbar";
import { RolePanel } from "./RolePanel";
import { RoleTabProvider } from "./tabs";

export function MainPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      <VideoBackground />

      <RoleTabProvider>
        <div className="relative z-10 flex min-h-screen flex-1 flex-col">
          <Navbar />

          <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12 sm:py-16">
            <Hero />
            <RolePanel />
          </main>

          <Footer />
        </div>
      </RoleTabProvider>
    </div>
  );
}
