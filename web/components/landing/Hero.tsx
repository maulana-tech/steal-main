"use client";

import { useEffect, useRef } from "react";
import { Eclipse, ArrowRight, X, MessageCircle, Globe } from "lucide-react";
import { ROLES, type RoleKey } from "./roles";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4";

export default function Hero({ onGoToRole }: { onGoToRole: (r: RoleKey) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Animate opacity with rAF (no CSS transitions, per spec).
    const animateOpacity = (from: number, to: number, duration: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        video.style.opacity = String(from + (to - from) * p);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const onCanPlay = () => {
      void video.play().catch(() => {});
      animateOpacity(0, 1, 500);
    };
    const onTimeUpdate = () => {
      const remaining = video.duration - video.currentTime;
      if (remaining <= 0.55 && remaining > 0) {
        animateOpacity(parseFloat(video.style.opacity || "1"), 0, 500);
      }
    };
    const onEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        void video.play().catch(() => {});
        animateOpacity(0, 1, 500);
      }, 100);
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    if (video.readyState >= 3) onCanPlay();

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        muted
        autoPlay
        playsInline
        preload="auto"
        style={{ opacity: 0 }}
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />

      {/* Navbar */}
      <nav className="relative z-20 px-6 py-6">
        <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
          <div className="flex items-center">
            <Eclipse className="h-6 w-6 text-white" />
            <span className="ml-2 text-lg font-semibold text-white">Eclipse</span>
            <div className="ml-8 hidden gap-8 md:flex">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => onGoToRole(r.key)}
                  className="text-sm font-medium text-white/80 hover:text-white"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#how" className="text-sm font-medium text-white">
              Docs
            </a>
            <button
              onClick={() => onGoToRole("borrower")}
              className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 -translate-y-[20%] flex-col items-center justify-center px-6 py-12 text-center">
        <h1
          className="whitespace-nowrap text-7xl tracking-tight text-white md:text-8xl lg:text-9xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Borrow in the <em className="italic">dark</em>.
        </h1>

        <p className="mt-8 max-w-xl px-4 text-sm leading-relaxed text-white">
          Confidential lending on Stellar. Deposit collateral and borrow USDC with
          amounts and credit scores hidden behind zero-knowledge proofs — prove your
          position is healthy without revealing a single number.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onGoToRole("borrower")}
            className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
          >
            Launch app
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#how"
            className="liquid-glass rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            How it works
          </a>
        </div>
      </div>

      {/* Social footer */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">
        {[X, MessageCircle, Globe].map((Icon, i) => (
          <a
            key={i}
            href="#"
            aria-label="social link"
            className="liquid-glass rounded-full p-4 text-white/80 transition-all hover:bg-white/5 hover:text-white"
          >
            <Icon className="h-5 w-5" />
          </a>
        ))}
      </div>
    </section>
  );
}
