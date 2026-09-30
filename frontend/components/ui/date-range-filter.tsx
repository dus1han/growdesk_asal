"use client";

import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { addDays, formatDate, isoDate, today, type DateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: () => ({ from: today(), to: today() }) },
  { label: "Last 7 days", range: () => ({ from: isoDate(addDays(new Date(), -6)), to: today() }) },
  { label: "Last 30 days", range: () => ({ from: isoDate(addDays(new Date(), -29)), to: today() }) },
  {
    label: "This month",
    range: () => {
      const n = new Date();
      return { from: isoDate(new Date(n.getFullYear(), n.getMonth(), 1)), to: today() };
    },
  },
  {
    label: "Last month",
    range: () => {
      const n = new Date();
      return { from: isoDate(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: isoDate(new Date(n.getFullYear(), n.getMonth(), 0)) };
    },
  },
  {
    label: "This year",
    range: () => ({ from: isoDate(new Date(new Date().getFullYear(), 0, 1)), to: today() }),
  },
];

function describe(r: DateRange) {
  if (r.from && r.to) return r.from === r.to ? formatDate(r.from) : `${formatDate(r.from)} – ${formatDate(r.to)}`;
  if (r.from) return `From ${formatDate(r.from)}`;
  if (r.to) return `Until ${formatDate(r.to)}`;
  return "";
}

/** A date-range pill with quick presets and custom from/to dates. */
export function DateRangeFilter({ label = "Date", value, onChange }: { label?: string; value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const set = !!(value.from || value.to);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "inline-flex h-9 items-center rounded-xl border text-sm transition-colors",
          set ? "border-brand/30 bg-brand-soft text-brand-strong" : "border-line bg-surface text-foreground/80 hover:border-slate-300",
        )}
      >
        <Popover.Trigger className="flex h-full items-center gap-1.5 rounded-xl pl-3 pr-2.5 font-medium">
          <CalendarRange className="size-3.5" />
          <span className="whitespace-nowrap">{set ? describe(value) : label}</span>
          {!set && <ChevronDown className="size-3.5 text-muted" />}
        </Popover.Trigger>
        {set && (
          <button type="button" onClick={() => onChange({})} aria-label={`Clear ${label} filter`} className="mr-1 flex size-6 items-center justify-center rounded-lg hover:bg-brand/10">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount align="start" sideOffset={6} collisionPadding={12}>
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="z-50 w-72 rounded-xl border border-line bg-surface p-2 shadow-pop"
              >
                <div className="grid grid-cols-2 gap-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        onChange(p.range());
                        setOpen(false);
                      }}
                      className="rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
                  <label className="text-xs font-medium text-muted">
                    From
                    <input
                      type="date"
                      value={value.from ?? ""}
                      max={value.to}
                      onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
                      className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    To
                    <input
                      type="date"
                      value={value.to ?? ""}
                      min={value.from}
                      onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
                      className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </label>
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
