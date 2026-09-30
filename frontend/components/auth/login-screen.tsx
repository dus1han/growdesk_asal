"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo, LogoMark } from "@/components/ui/logo";
import { useBranding, useSession } from "@/lib/auth/session";
import { LoginBackdrop } from "./login-backdrop";
import { LoginForm, safeNextPath } from "./login-form";
import { LoginVisual } from "./login-visual";

const ease = [0.22, 1, 0.36, 1] as const;

export function LoginScreen() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { data: branding } = useBranding();
  const { data: session } = useSession();
  const [leaving, setLeaving] = useState(false);

  // Already signed in (valid cookie): go straight to the app.
  useEffect(() => {
    if (session && !leaving) router.replace(next);
  }, [session, leaving, next, router]);

  const name = branding?.crmName ?? "GrowDesk";
  const tagline = branding?.tagline ?? "";

  return (
    <main className="relative flex min-h-dvh overflow-hidden text-white">
      <LoginBackdrop />

      {/* Brand panel (desktop) */}
      <section className="relative hidden flex-1 flex-col justify-between p-12 lg:flex xl:p-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease }}
        >
          <BrandLogo name={name} logoUrl={branding?.logoUrl} className="text-white" />
        </motion.div>

        <div className="flex flex-1 items-center justify-center py-8">
          <LoginVisual />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
          className="max-w-md"
        >
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Care that{" "}
            <span className="bg-gradient-to-r from-[#a5a5ff] via-[#8b8bff] to-accent bg-clip-text text-transparent">
              grows
            </span>{" "}
            with every visit.
          </h1>
          {tagline && <p className="mt-4 text-base text-white/60">{tagline}</p>}
        </motion.div>
      </section>

      {/* Sign-in panel */}
      <section className="relative flex w-full items-center justify-center px-4 py-10 sm:px-6 lg:w-[520px] lg:shrink-0 lg:px-12 xl:w-[580px]">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={leaving ? { opacity: 0, y: -12, scale: 0.97 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: leaving ? 0.45 : 0.8, delay: leaving ? 0.25 : 0.2, ease }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease }}
            className="mb-8 flex flex-col items-center text-center lg:hidden"
          >
            <LogoMark className="size-14" />
            <p className="mt-3 font-display text-2xl font-bold tracking-tight">{name}</p>
            {tagline && <p className="mt-1 text-sm text-white/55">{tagline}</p>}
          </motion.div>

          <div className="relative rounded-3xl border border-white/10 bg-white/[0.045] p-7 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-2xl sm:p-9">
            {/* Top edge highlight */}
            <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease }}
              className="mb-8"
            >
              <h2 className="font-display text-[28px] font-bold tracking-tight">Welcome back</h2>
              <p className="mt-1.5 text-sm text-white/55">Sign in to continue to {name}.</p>
            </motion.div>

            <LoginForm next={next} onSuccess={() => setLeaving(true)} />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mt-6 text-center text-xs text-white/35"
          >
            Trouble signing in? Ask your administrator to reset your password.
          </motion.p>
        </motion.div>
      </section>

      {/* Exit transition: a brand-coloured wash that the dashboard fades in from. */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 bg-background"
            initial={{ clipPath: "circle(0% at 50% 60%)" }}
            animate={{ clipPath: "circle(150% at 50% 60%)" }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.65, 0, 0.35, 1] }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </main>
  );
}
