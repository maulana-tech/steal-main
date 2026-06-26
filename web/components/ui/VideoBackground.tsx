"use client";

// Full-screen looping background video with a dark veil for legibility.
const BG_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4";

export function VideoBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src={BG_VIDEO}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/75" />
    </div>
  );
}
