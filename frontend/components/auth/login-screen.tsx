"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo, LogoMark } from "@/components/ui/logo";
import { useBranding, useLogout, useSession } from "@/lib/auth/session";
import { LoginBackdrop } from "./login-backdrop";
import { changePasswordPath, LoginForm, safeNextPath } from "./login-form";
import { SetPasswordForm } from "./set-password-form";
import { LoginVisual } from "./login-visual";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The sign-in screen, and its second step: choosing a password after signing in with a temporary
 * one (mode "set-password", at /change-password). Both share the premium backdrop and card.
 */
export function LoginScreen({ mode = "sign-in" }: { mode?: "sign-in" | "set-password" }) {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { data: branding } = useBranding();
  const { data: session } = useSession();
  const logout = useLogout();
  const [leaving, setLeaving] = useState(false);
  const settingPassword = mode === "set-password";

  // Send the user wherever their session says they belong.
  useEffect(() => {
    if (leaving || session === undefined) return;
    if (settingPassword) {
      if (session === null) router.replace("/login");
      else if (!session.user.mustChangePassword) router.replace(next);
    } else if (session) {
      router.replace(session.user.mustChangePassword ? changePasswordPath(next) : next);
    }
  }, [session, leaving, settingPassword, next, router]);

  const name = branding?.crmName ?? "GrowDesk";
  const tagline = branding?.tagline ?? "";

  return (
    <main className="relative flex min-h-dvh overflow-hidden text-white">
      <LoginBackdrop />

      {/* Brand panel (desktop) */}
      <section className="relative hidden h-dvh flex-1 flex-col justify-between p-12 lg:flex xl:p-16 [@media(max-height:820px)]:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease }}
        >
          <BrandLogo name={name} logoUrl={branding?.logoUrl} className="text-white" />
        </motion.div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-6 [@media(max-height:820px)]:py-3">
          <LoginVisual />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
          className="max-w-md"
        >
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl [@media(max-height:820px)]:text-4xl">
            Care that{" "}
            <span className="bg-gradient-to-r from-[#a5a5ff] via-[#8b8bff] to-accent bg-clip-text text-transparent">
              grows
            </span>{" "}
            with every visit.
          </h1>
          {tagline && <p className="mt-4 text-base text-white/60 [@media(max-height:820px)]:mt-2">{tagline}</p>}
        </motion.div>
      </section>

      {/* Sign-in panel */}
      <section className="relative flex w-full items-center justify-center px-4 py-10 [@media(max-height:700px)]:py-5 sm:px-6 lg:w-[520px] lg:shrink-0 lg:px-12 xl:w-[580px]">
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
            className="mb-8 flex flex-col items-center text-center lg:hidden [@media(max-height:700px)]:mb-5"
          >
            <LogoMark className="size-14 [@media(max-height:700px)]:size-11" />
            <p className="mt-3 font-display text-2xl font-bold tracking-tight [@media(max-height:700px)]:mt-2">{name}</p>
            {tagline && <p className="mt-1 text-sm text-white/55 [@media(max-height:700px)]:hidden">{tagline}</p>}
          </motion.div>

          <div className="relative rounded-3xl border border-white/10 bg-white/[0.045] p-7 [@media(max-height:700px)]:p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-2xl sm:p-9">
            {/* Top edge highlight */}
            <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease }}
              className="mb-8 [@media(max-height:700px)]:mb-6"
            >
              {settingPassword ? (
                <>
                  <h2 className="font-display text-[28px] font-bold tracking-tight">Choose your password</h2>
                  <p className="mt-1.5 text-sm text-white/55">
                    {session?.user ? `Welcome, ${session.user.fullName.split(" ")[0]}. ` : ""}
                    Replace your temporary password with one only you know.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-display text-[28px] font-bold tracking-tight">Welcome back</h2>
                  <p className="mt-1.5 text-sm text-white/55">Sign in to continue to {name}.</p>
                </>
              )}
            </motion.div>

            {settingPassword ? (
              <SetPasswordForm next={next} onSuccess={() => setLeaving(true)} />
            ) : (
              <LoginForm next={next} onSuccess={() => setLeaving(true)} />
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mt-6 text-center text-xs text-white/35 [@media(max-height:700px)]:mt-4"
          >
            {settingPassword ? (
              <>
                Not you?{" "}
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="font-medium text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              "Trouble signing in? Ask your administrator to reset your password."
            )}
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
