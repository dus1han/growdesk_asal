"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { MockToolbar } from "@/components/capture/mock-toolbar";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CaptureField } from "@/types/admin";

/**
 * Faithful preview of the GrowDesk Capture Chrome extension (CHExt, branch growdesk-capture): a
 * 48px toolbar pinned to the top of WhatsApp Web / Instagram. Text fields are filled by
 * highlighting text and choosing "GrowDesk Capture → Set as …" from the right-click menu; list,
 * date and yes/no fields open a picker on the toolbar. Colours, sizes and wording follow
 * CHExt/src/content/toolbar/toolbar.css and Toolbar.tsx.
 */

/** Example values for the "capturing" state. */
const SAMPLE_VALUES: Record<string, string> = {
  name: "Sarah Fernando",
  whatsapp: "+971 50 123 4567",
  treatments: "Botox",
};

/** Fields chosen on the toolbar rather than highlighted (CHExt fieldKind). */
const PICK_TYPES = new Set(["dropdown", "multiselect", "boolean", "date"]);

const menuLabel = (f: CaptureField) => (f.type === "textarea" ? `Add to ${f.label}` : `Set as ${f.label}`);

/** The preview is laid out at a real laptop width, then scaled to fit, so nothing reflows. */
const DESIGN_WIDTH = 1366;

function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / DESIGN_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

export function CaptureToolbarPreview({ fields }: { fields: CaptureField[] }) {
  const [capturing, setCapturing] = useState(false);
  const textFields = fields.filter((f) => !PICK_TYPES.has(f.type));
  const { ref, scale } = useFitScale();
  const frameHeight = 440;

  return (
    <section className="mt-6" aria-label="Capture tool preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Preview</p>
          <p className="mt-0.5 text-xs text-muted">The GrowDesk Capture toolbar as it appears at the top of WhatsApp Web.</p>
        </div>
        <div className="inline-flex rounded-xl bg-surface-muted p-1 text-xs font-medium" role="tablist" aria-label="Toolbar state">
          {[
            { value: false, label: "Before START" },
            { value: true, label: "Capturing" },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              aria-selected={capturing === s.value}
              onClick={() => setCapturing(s.value)}
              className={cn(
                "relative rounded-lg px-3 py-1.5 transition-colors",
                capturing === s.value ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {capturing === s.value && (
                <motion.span layoutId="toolbar-state" className="absolute inset-0 rounded-lg bg-surface shadow-card" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              )}
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card" style={{ height: frameHeight * scale }} aria-hidden>
        <div style={{ width: DESIGN_WIDTH, height: frameHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-line bg-[#eef1f5] px-4 py-2">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex h-6 w-96 items-center rounded-md bg-white px-3 text-[11px] text-[#6b7686]">
              web.whatsapp.com
            </div>
          </div>

          {/* The toolbar: the same mock the animated guide uses. */}
          <MockToolbar
            capturing={capturing}
            chips={fields.map((f) => ({
              key: f.key,
              label: f.label,
              required: f.isRequired,
              pick: PICK_TYPES.has(f.type),
              value: capturing ? SAMPLE_VALUES[f.key] : undefined,
            }))}
            status={capturing ? "WhatsApp Number: +971 50 123 4567" : undefined}
            tone="success"
          />

          {/* WhatsApp Web beneath the toolbar */}
          <div className="relative flex h-[352px] bg-[#efeae2]">
            <div className="w-80 shrink-0 space-y-3 border-r border-black/5 bg-white/80 p-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="size-7 shrink-0 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-slate-200" />
                    <div className="h-1.5 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>

            <div className="relative flex-1 p-5">
              <div className="max-w-[260px] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[12.5px] text-[#1c2430] shadow-sm">
                Hi, my name is{" "}
                <span className={cn(capturing && "rounded-sm bg-[#b3d4fc]")}>Sarah Fernando</span>, my number is +971 50 123 4567
              </div>
              <div className="ml-auto mt-3 h-7 w-1/3 rounded-lg rounded-tr-none bg-[#d9fdd3] shadow-sm" />

              {/* Right-click menu, only offered while capturing (contextMenus.ts) */}
              <AnimatePresence>
                {capturing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-40 top-16 flex items-start text-[12.5px] text-[#1c2430]"
                  >
                    <div className="w-44 rounded-md border border-black/10 bg-white py-1 shadow-lg">
                      <p className="px-3 py-1.5 text-[#9aa3af]">Copy</p>
                      <p className="px-3 py-1.5 text-[#9aa3af]">Search Google for…</p>
                      <div className="my-1 h-px bg-black/10" />
                      <p className="flex items-center justify-between bg-[#e8f0fe] px-3 py-1.5">
                        GrowDesk Capture <ChevronRight className="size-3.5" />
                      </p>
                    </div>
                    <div className="-ml-1 mt-[58px] w-56 rounded-md border border-black/10 bg-white py-1 shadow-lg">
                      {textFields.map((f, i) => (
                        <p key={f.key} className={cn("px-3 py-1.5", i === 0 && "bg-[#e8f0fe]")}>
                          {menuLabel(f)}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="absolute bottom-3 right-4 text-[10px] text-slate-500">WhatsApp Web</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        <span className="text-danger">*</span> required before STOP can save. <span className="font-medium">▾</span> pick-list fields are
        chosen on the toolbar rather than highlighted.
      </p>
    </section>
  );
}
