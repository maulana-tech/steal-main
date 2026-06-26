"use client";

import { motion } from "framer-motion";

const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4";

const serif = { fontFamily: "'Instrument Serif', serif" } as const;
const viewport = { once: true, margin: "-100px" } as const;

export default function PhilosophySection() {
  return (
    <section className="overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.8 }}
          className="mb-16 text-5xl tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl"
        >
          Privacy{" "}
          <span className="italic text-white/40" style={serif}>
            ×
          </span>{" "}
          Proof
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8 }}
            className="aspect-[4/3] overflow-hidden rounded-3xl"
          >
            <video
              src={VIDEO}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8 }}
          >
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                Prove threshold, hide the number
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                Every position is committed as a Poseidon hash on-chain. A Noir circuit
                proves your collateral is sufficient, your credit score clears the
                threshold, and your health factor stays above one — without exposing any
                of the underlying values.
              </p>
            </div>

            <div className="my-8 h-px w-full bg-white/10" />

            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                Selective disclosure
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                Auditors decrypt full positions through a view key you choose to share.
                The public sees only commitments; regulators see exactly what they are
                authorized to. Privacy and compliance in one protocol.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
