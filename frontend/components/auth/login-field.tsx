"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LoginFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

/** Glass input for the dark login card: animated glow on focus, password visibility toggle. */
export const LoginField = forwardRef<HTMLInputElement, LoginFieldProps>(function LoginField(
  { label, icon: Icon, error, type = "text", id, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-white/70">
        {label}
      </label>
      <div className="relative">
        {/* Focus glow */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[13px] bg-gradient-to-r from-[#7c7cff] via-brand to-accent"
          initial={false}
          animate={{ opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
        <div
          className={cn(
            "relative flex items-center rounded-xl border bg-[#101028]/90 transition-colors duration-200",
            error ? "border-red-400/60" : "border-white/10",
            focused && "border-transparent",
          )}
        >
          <Icon
            className={cn("ml-3.5 size-[18px] shrink-0 transition-colors duration-200", focused ? "text-[#a5a5ff]" : "text-white/40")}
          />
          <input
            ref={ref}
            id={id}
            type={isPassword && revealed ? "text" : type}
            aria-invalid={!!error}
            aria-describedby={errorId}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className="h-12 w-full bg-transparent px-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none"
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Hide password" : "Show password"}
              className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={revealed ? "hide" : "show"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  {revealed ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-1.5 text-xs text-red-300"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});
