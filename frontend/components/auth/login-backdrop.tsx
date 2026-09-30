"use client";

import { motion } from "framer-motion";

/** Deterministic pseudo-random numbers, so server and client render identical particles. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(42);
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: rand() * 100,
  top: rand() * 100,
  size: 1.5 + rand() * 2.5,
  duration: 9 + rand() * 12,
  delay: rand() * 6,
  drift: 20 + rand() * 40,
}));

/** Full-bleed animated background: slow aurora blobs, a faint grid and drifting particles. */
export function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#07071a]" />

      {/* Aurora blobs */}
      <div className="absolute -left-[20%] -top-[30%] size-[70vmax] animate-aurora rounded-full bg-[radial-gradient(circle_at_center,rgb(91_91_246/0.55),transparent_62%)] blur-3xl" />
      <div
        className="absolute -bottom-[35%] -right-[15%] size-[65vmax] animate-aurora rounded-full bg-[radial-gradient(circle_at_center,rgb(20_184_166/0.38),transparent_60%)] blur-3xl"
        style={{ animationDelay: "-6s", animationDuration: "22s" }}
      />
      <div
        className="absolute left-[30%] top-[40%] size-[40vmax] animate-aurora rounded-full bg-[radial-gradient(circle_at_center,rgb(168_85_247/0.28),transparent_60%)] blur-3xl"
        style={{ animationDelay: "-12s", animationDuration: "26s" }}
      />

      {/* Grid, faded towards the edges */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Particles */}
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0], y: [0, -p.drift, -p.drift * 2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(7_7_26/0.85)_100%)]" />
    </div>
  );
}
