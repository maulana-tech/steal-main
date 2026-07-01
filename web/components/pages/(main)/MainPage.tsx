import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { VideoBackground } from "@/components/ui/VideoBackground";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Navbar } from "./Navbar";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";
import { TechStackSection } from "./sections/TechStackSection";
import { CtaSection } from "./sections/CtaSection";

export function MainPage() {
  return (
    <SmoothScroll>
      {/* No overflow-hidden here: it would break the sticky navbar and page
          scroll. The video is fixed, so it needs no clipping. The interactive
          app lives on /app; this page is the marketing landing. */}
      <div className="relative min-h-screen bg-black">
        <VideoBackground />

        <div className="relative z-10">
          <Navbar />

          <main>
            <Hero />
            <FeaturesSection />
            <HowItWorksSection />
            <TechStackSection />
            <CtaSection />
          </main>

          <Footer />
        </div>
      </div>
    </SmoothScroll>
  );
}
