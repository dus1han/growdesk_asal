"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Check, KeyRound, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ApiError } from "@/lib/api/client";
import { changePasswordSchema, PASSWORD_RULES, type ChangePasswordValues } from "@/lib/auth/password";
import { useChangePassword } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { LoginField } from "./login-field";
import { SubmitButton, type Phase } from "./login-form";

const ease = [0.22, 1, 0.36, 1] as const;

/** First sign-in after an account is created or reset: replace the temporary password. */
export function SetPasswordForm({ next, onSuccess }: { next: string; onSuccess: () => void }) {
  const router = useRouter();
  const change = useChangePassword();
  const shake = useAnimationControls();
  const [phase, setPhase] = useState<Phase>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    setPhase("submitting");
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      setPhase("success");
      onSuccess();
      setTimeout(() => router.replace(next), 900);
    } catch (error) {
      setPhase("idle");
      const fieldErrors = error instanceof ApiError ? error.fieldErrors : [];
      for (const fe of fieldErrors) {
        if (fe.field === "currentPassword" || fe.field === "newPassword") setError(fe.field, { message: fe.message });
      }
      if (fieldErrors.length === 0) setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
      void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
    }
  });

  const busy = phase !== "idle";
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: 0.45 + i * 0.08, ease },
  });

  return (
    <motion.div animate={shake}>
      <form onSubmit={onSubmit} noValidate className="space-y-5 [@media(max-height:760px)]:space-y-4">
        <motion.div {...stagger(0)}>
          <LoginField
            id="currentPassword"
            label="Temporary password"
            icon={KeyRound}
            type="password"
            autoComplete="current-password"
            placeholder="From your administrator"
            autoFocus
            disabled={busy}
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
        </motion.div>

        <motion.div {...stagger(1)}>
          <LoginField
            id="newPassword"
            label="New password"
            icon={LockKeyhole}
            type="password"
            autoComplete="new-password"
            placeholder="Choose a password"
            disabled={busy}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(newPassword);
              return (
                <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs transition-colors duration-200", met ? "text-accent" : "text-white/40")}>
                  <motion.span
                    initial={false}
                    animate={{ scale: met ? 1 : 0.85, opacity: met ? 1 : 0.6 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className={cn("flex size-3.5 items-center justify-center rounded-full", met ? "bg-accent/20" : "bg-white/10")}
                  >
                    {met && <Check className="size-2.5" strokeWidth={3} />}
                  </motion.span>
                  {rule.label}
                  <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div {...stagger(2)}>
          <LoginField
            id="confirm"
            label="Confirm new password"
            icon={ShieldCheck}
            type="password"
            autoComplete="new-password"
            placeholder="Type it again"
            disabled={busy}
            error={errors.confirm?.message}
            {...register("confirm")}
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

        <motion.div {...stagger(3)}>
          <SubmitButton phase={phase} label="Save and continue" busyLabel="Saving your password" />
        </motion.div>
      </form>
    </motion.div>
  );
}
