"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, CircleHelp, Play, Scan, X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * A faithful stand-in for the GrowDesk Capture toolbar (CHExt/src/content/toolbar), used by the
 * admin preview and the animated guide. Elements carry data-target attributes so the guide's
 * cursor can find them.
 */

export interface MockChip {
  key: string;
  label: string;
  required?: boolean;
  /** Shown after the label once captured. */
  value?: string;
  /** Chosen from a list on the toolbar rather than highlighted. */
  pick?: boolean;
}

export interface MockPicker {
  chipKey: string;
  title: string;
  /** Open towards the left, for chips near the right edge. */
  align?: "left" | "right";
  options: { label: string; checked: boolean }[];
}

export type MockTone = "success" | "error" | "warning" | "hint" | "pending";

const TONE: Record<MockTone, string> = {
  success: "text-success",
  error: "text-danger",
  warning: "text-warning",
  hint: "text-muted",
  pending: "text-brand-strong",
};

export function MockToolbar({
  capturing,
  chips,
  platform = "WhatsApp",
  status,
  tone = "hint",
  busy,
  picker,
  pressed,
  textPopover,
}: {
  capturing: boolean;
  chips: MockChip[];
  platform?: string;
  status?: string;
  tone?: MockTone;
  busy?: boolean;
  picker?: MockPicker | null;
  /** data-target of a control shown pressed (the guide's click). */
  pressed?: string | null;
  /** A text field's pop-up, open under its chip (offers "Draw a box around it"). */
  textPopover?: { chipKey: string; title: string } | null;
}) {
  const press = (t: string) => (pressed === t ? "scale-[0.96]" : "");
  return (
    <div
      className="relative z-20 flex h-12 items-center gap-3 border-b border-line bg-white pl-3.5 pr-3 font-sans text-foreground"
      style={{ boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -8px rgb(15 23 42 / 0.12)" }}
    >
      <motion.span
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#7c7cff] via-brand to-accent"
        initial={false}
        animate={{ opacity: capturing ? 1 : 0 }}
      />
      <span className="flex shrink-0 items-center gap-2">
        <LogoMark className="size-6" />
        <span className="text-sm font-bold tracking-tight">GrowDesk</span>
        <span className="text-xs font-medium text-muted">Capture</span>
      </span>
      <Divider />

      <AnimatePresence mode="wait" initial={false}>
        {capturing ? (
          <motion.span
            key="on"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-soft px-2.5 text-xs font-semibold text-brand-strong"
          >
            <motion.span
              className="size-[7px] rounded-full bg-brand"
              animate={{ boxShadow: ["0 0 0 0 rgb(91 91 246 / 0.45)", "0 0 0 6px rgb(91 91 246 / 0)"] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            Capturing
          </motion.span>
        ) : (
          <motion.span
            key="off"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-surface-muted px-2.5 text-xs font-semibold text-muted"
          >
            {platform}
          </motion.span>
        )}
      </AnimatePresence>
      <Divider />

      {/* The chips keep their width; the message area takes what is left. */}
      <span className="flex shrink-0 items-center gap-1.5">
        {chips.map((c) => {
          const set = capturing && Boolean(c.value);
          return (
            <span key={c.key} className="relative shrink-0">
              <motion.span
                layout
                data-target={`chip-${c.key}`}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border pl-[7px] pr-2.5 text-[12.5px] font-medium transition-[transform,box-shadow] duration-150",
                  set ? "border-brand/25 bg-brand-soft text-foreground" : "border-line bg-white text-muted",
                  !capturing && "opacity-75",
                  picker?.chipKey === c.key && "border-brand shadow-[0_0_0_3px_rgb(91_91_246/0.15)]",
                  press(`chip-${c.key}`),
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                    set ? "bg-gradient-to-br from-brand to-accent text-white" : "border-[1.5px] border-current opacity-55",
                  )}
                >
                  <AnimatePresence>
                    {set && (
                      <motion.span initial={{ scale: 0.2 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                        <Check className="size-2.5" strokeWidth={3.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {c.label}
                {c.required && !set && <span className="-ml-1 font-bold text-danger">*</span>}
                {set && (
                  <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="max-w-[110px] truncate text-xs text-muted">
                    {c.value}
                  </motion.span>
                )}
                {c.pick && capturing && <ChevronDown className="-mr-0.5 size-3 text-muted" />}
              </motion.span>

              <AnimatePresence>
                {textPopover?.chipKey === c.key && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-0 top-[calc(100%+8px)] z-30 w-64 overflow-hidden rounded-[14px] border border-line bg-white shadow-pop"
                  >
                    <p className="px-3.5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">{textPopover.title}</p>
                    <div className="px-3.5 pb-3">
                      <span
                        data-target="pop-draw"
                        className={cn(
                          "flex h-[34px] items-center justify-center gap-2 rounded-[9px] bg-brand text-[12.5px] font-semibold text-white transition-transform duration-150",
                          press("pop-draw"),
                        )}
                      >
                        <Scan className="size-[15px]" /> Draw a box around it
                      </span>
                      <p className="mt-2 text-[11.5px] leading-snug text-muted">
                        For text that can&apos;t be highlighted, like the name in Contact info.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {picker?.chipKey === c.key && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    className={cn(
                      "absolute top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-[14px] border border-line bg-white shadow-pop",
                      picker.align === "right" ? "right-0" : "left-0",
                    )}
                  >
                    <p className="px-3.5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">{picker.title}</p>
                    <div className="px-1.5 pb-1.5">
                      {picker.options.map((o) => (
                        <div
                          key={o.label}
                          data-target={`opt-${o.label}`}
                          className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px]", o.checked && "font-semibold text-brand-strong")}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
                              o.checked ? "border-brand bg-brand text-white" : "border-line",
                            )}
                          >
                            {o.checked && <Check className="size-2.5" strokeWidth={3.5} />}
                          </span>
                          {o.label}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-line px-2.5 py-2">
                      <span className="px-2 py-1.5 text-[12.5px] font-semibold text-muted">Clear</span>
                      <span data-target="picker-done" className={cn("rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white", press("picker-done"))}>
                        Done
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
          );
        })}
      </span>
      <Divider />

      <span className={cn("min-w-0 flex-1 truncate text-[12.5px] font-medium", TONE[tone])}>
        <AnimatePresence mode="wait" initial={false}>
          {status && (
            <motion.span key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="block truncate">
              {status}
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      <span data-target="help" className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg text-muted", press("help"))}>
        <CircleHelp className="size-4" />
      </span>
      {capturing && (
        <span data-target="discard" className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg text-muted", press("discard"))}>
          <X className="size-4" />
        </span>
      )}
      <span
        data-target="action"
        className={cn(
          "inline-flex h-8 min-w-[88px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[12.5px] font-bold tracking-[0.04em] text-white transition-transform duration-150",
          capturing
            ? "bg-gradient-to-r from-brand to-accent shadow-[0_6px_16px_-8px_rgb(20_184_166/0.9)]"
            : "bg-gradient-to-r from-[#7c7cff] to-brand shadow-[0_6px_16px_-8px_rgb(91_91_246/0.9)]",
          press("action"),
        )}
      >
        {busy ? (
          <motion.span
            className="size-3.5 rounded-full border-2 border-white/35 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          />
        ) : capturing ? (
          <ArrowRight className="size-3.5" strokeWidth={2.6} />
        ) : (
          <Play className="size-3.5" strokeWidth={2.4} />
        )}
        {capturing ? "STOP" : "START"}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="h-[22px] w-px shrink-0 bg-line" />;
}
