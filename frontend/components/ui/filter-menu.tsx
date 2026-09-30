"use client";

import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  /** Optional colour dot (stages). */
  color?: string;
}

interface FilterMenuProps {
  label: string;
  options: FilterOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** Show a search box when there are this many options or more. */
  searchThreshold?: number;
}

/**
 * A filter pill: shows the filter name, or the chosen value once set (with a clear button).
 * Opens a keyboard-navigable list; long lists get a search box.
 */
export function FilterMenu({ label, options, value, onChange, searchThreshold = 8 }: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <div
        className={cn(
          "inline-flex h-9 items-center rounded-xl border text-sm transition-colors",
          selected ? "border-brand/30 bg-brand-soft text-brand-strong" : "border-line bg-surface text-foreground/80 hover:border-slate-300",
        )}
      >
        <Popover.Trigger className="flex h-full items-center gap-1.5 rounded-xl pl-3 pr-2.5 font-medium focus-visible:outline-offset-2">
          {selected?.color && <span className="size-2 rounded-full" style={{ backgroundColor: selected.color }} />}
          <span className="whitespace-nowrap">{selected ? selected.label : label}</span>
          {!selected && <ChevronDown className="size-3.5 text-muted" />}
        </Popover.Trigger>
        {selected && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label={`Clear ${label} filter`}
            className="mr-1 flex size-6 items-center justify-center rounded-lg hover:bg-brand/10"
          >
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
                className="z-50 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
              >
                {options.length >= searchThreshold && (
                  <div className="border-b border-line p-2">
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${label.toLowerCase()}…`}
                      aria-label={`Search ${label.toLowerCase()}`}
                      className="h-8 w-full rounded-lg bg-surface-muted px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                )}
                <ul role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1">
                  {visible.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
                  {visible.map((o) => {
                    const isSelected = o.value === value;
                    return (
                      <li key={o.value} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(isSelected ? undefined : o.value);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
                            isSelected && "font-medium text-brand-strong",
                          )}
                        >
                          {o.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />}
                          <span className="flex-1 truncate">{o.label}</span>
                          {isSelected && <Check className="size-4 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
