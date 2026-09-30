"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { ArrowRight, Check, LockKeyhole, TriangleAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { useLogin } from "@/lib/auth/session";
import { LoginField } from "./login-field";

const schema = z.object({
  username: z.string().trim().min(1, "Please enter your username.").max(50, "Usernames are at most 50 characters."),
  password: z.string().min(1, "Please enter your password."),
});
type FormValues = z.infer<typeof schema>;

type Phase = "idle" | "submitting" | "success";

const ease = [0.22, 1, 0.36, 1] as const;

/** Only same-app paths are allowed after login, never an external URL (open-redirect guard). */
export function safeNextPath(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/dashboard";
}

export function LoginForm({ next, onSuccess }: { next: string; onSuccess: () => void }) {
  const router = useRouter();
  const login = useLogin();
  const shake = useAnimationControls();
  const [phase, setPhase] = useState<Phase>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setPhase("submitting");
    try {
      await login.mutateAsync(values);
      setPhase("success");
      onSuccess();
      // Let the success check and the page transition play before navigating.
      setTimeout(() => router.replace(next), 900);
    } catch (error) {
      setPhase("idle");
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        for (const fe of error.fieldErrors) {
          if (fe.field === "username" || fe.field === "password") setError(fe.field, { message: fe.message });
        }
      }
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
      void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
    }
  });

  const busy = phase !== "idle";
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: 0.55 + i * 0.08, ease },
  });

  return (
    <motion.div animate={shake}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <motion.div {...stagger(0)}>
          <LoginField
            id="username"
            label="Username"
            icon={UserRound}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Your username"
            autoFocus
            disabled={busy}
            error={errors.username?.message}
            {...register("username")}
          />
        </motion.div>

        <motion.div {...stagger(1)}>
          <LoginField
            id="password"
            label="Password"
            icon={LockKeyhole}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={busy}
            error={errors.password?.message}
            {...register("password")}
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {formError && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2.5 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
                <TriangleAlert className="size-4 shrink-0" />
                {formError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div {...stagger(2)}>
          <SubmitButton phase={phase} />
        </motion.div>
      </form>
    </motion.div>
  );
}

/** Sign In → progress sweep while authenticating → check mark on success. */
function SubmitButton({ phase }: { phase: Phase }) {
  return (
    <motion.button
      type="submit"
      disabled={phase !== "idle"}
      whileHover={phase === "idle" ? { scale: 1.015 } : undefined}
      whileTap={phase === "idle" ? { scale: 0.98 } : undefined}
      animate={{
        backgroundPosition: phase === "success" ? "100% 50%" : "0% 50%",
      }}
      transition={{ duration: 0.5, ease }}
      className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(90deg,#6d6dff,#5b5bf6_45%,#14b8a6)] bg-[length:220%_100%] text-[15px] font-semibold text-white shadow-[0_12px_32px_-10px_rgb(91_91_246/0.9)] focus-visible:outline-white disabled:cursor-default"
    >
      {/* Sheen on hover */}
      <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />

      <AnimatePresence mode="wait" initial={false}>
        {phase === "idle" && (
          <motion.span
            key="idle"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            Sign in
            <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-1" />
          </motion.span>
        )}
        {phase === "submitting" && (
          <motion.span
            key="submitting"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            Signing you in
          </motion.span>
        )}
        {phase === "success" && (
          <motion.span
            key="success"
            className="flex size-7 items-center justify-center rounded-full bg-white/25"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
          >
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Progress sweep while submitting */}
      <AnimatePresence>
        {phase === "submitting" && (
          <motion.span
            key="progress"
            className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="absolute inset-y-0 w-2/5 rounded-full bg-white/90"
              animate={{ left: ["-40%", "100%"] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
