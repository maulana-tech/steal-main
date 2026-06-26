"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const serif = { fontFamily: "'Instrument Serif', serif" } as const;

export default function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="how"
      ref={ref}
      className="relative overflow-hidden bg-black px-6 pb-10 pt-32 md:pb-14 md:pt-44"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-sm uppercase tracking-widest text-white/40"
        >
          The Protocol
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-6 text-4xl leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          <span className="italic text-white/60" style={serif}>
            Confidential credit
          </span>{" "}
          for
          <br className="hidden md:block" />{" "}
          <span className="italic text-white/60" style={serif}>
            borrowers who prove, not reveal.
          </span>
        </motion.h2>
      </div>
    </section>
  );
}
