"use client";

import { motion } from "framer-motion";
import { CalendarCheck2, HeartPulse, Sparkles } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Abstract wellness visual for the brand panel: orbiting rings around a glowing core, a pulse
 * line drawing itself across, and three floating glass chips naming what the product does.
 */
export function LoginVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]" aria-hidden>
      {/* Core glow */}
      <motion.div
        className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle,rgb(124_124_255/0.9),rgb(91_91_246/0.25)_55%,transparent_70%)] blur-md"
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbit rings */}
      {[
        { inset: "12%", duration: 38, dot: "bg-accent", reverse: false },
        { inset: "22%", duration: 28, dot: "bg-[#a78bfa]", reverse: true },
        { inset: "2%", duration: 55, dot: "bg-white", reverse: false },
      ].map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/10"
          style={{ inset: ring.inset }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1, rotate: ring.reverse ? -360 : 360 }}
          transition={{
            opacity: { duration: 1, delay: 0.3 + i * 0.15, ease },
            scale: { duration: 1.2, delay: 0.3 + i * 0.15, ease },
            rotate: { duration: ring.duration, repeat: Infinity, ease: "linear" },
          }}
        >
          <span className={`absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full ${ring.dot} shadow-[0_0_16px_4px_rgb(255_255_255/0.35)]`} />
        </motion.div>
      ))}

      {/* Pulse line */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="gd-pulse" x1="0" x2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
            <stop offset="30%" stopColor="#14b8a6" />
            <stop offset="70%" stopColor="#8b8bff" />
            <stop offset="100%" stopColor="#8b8bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M20 205 H140 L158 170 L176 245 L196 150 L214 228 L230 205 H380"
          fill="none"
          stroke="url(#gd-pulse)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut", times: [0, 0.6, 1] }}
        />
      </svg>

      {/* Floating chips */}
      {[
        { icon: CalendarCheck2, label: "Consultations", className: "left-[-4%] top-[18%]", delay: 0.9, float: 10 },
        { icon: HeartPulse, label: "Follow-ups", className: "right-[-6%] top-[44%]", delay: 1.05, float: 14 },
        { icon: Sparkles, label: "Treatments", className: "bottom-[12%] left-[8%]", delay: 1.2, float: 12 },
      ].map(({ icon: Icon, label, className, delay, float }) => (
        <motion.div
          key={label}
          className={`absolute ${className}`}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay, ease }}
        >
          <motion.div
            className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-sm font-medium text-white/90 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.5)] backdrop-blur-md"
            animate={{ y: [0, -float, 0] }}
            transition={{ duration: 5 + float / 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/10">
              <Icon className="size-4" />
            </span>
            {label}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
