"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Lock, MessageCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fieldTypeMeta } from "@/components/admin/field-types";
import { SortableList } from "@/components/admin/sortable-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, Switch } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, useCaptureFields, useSaveCaptureFields } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import type { CaptureField } from "@/types/admin";

export default function CaptureToolPage() {
  const { data: saved, isPending, isError, refetch } = useCaptureFields();
  const save = useSaveCaptureFields();
  // Local draft; null means "no edits yet, show what the server has".
  const [draft, setDraft] = useState<CaptureField[] | null>(null);
  const fields = draft ?? saved ?? [];
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = (key: string, change: Partial<CaptureField>) =>
    setDraft(
      fields.map((f) => {
        if (f.key !== key) return f;
        const next = { ...f, ...change };
        if (!next.isEnabled) next.isRequired = false; // a hidden field can't be required
        return next;
      }),
    );

  const onSave = () =>
    save.mutate(
      fields.map(({ key, isEnabled, isRequired }) => ({ key, isEnabled, isRequired })),
      {
        onSuccess: () => {
          setDraft(null);
          toast.success("Capture tool fields saved");
        },
        onError: toastError,
      },
    );

  return (
    <>
      <PageHeader
        title="Capture Tool"
        description="Choose which fields the WhatsApp capture tool (Chrome) asks for, which are required, and their order."
      />

      {isPending ? (
        <Card className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </Card>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load the capture fields"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RotateCcw className="size-4" /> Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-surface-muted/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              <span className="flex-1 pl-9">Field</span>
              <span className="w-12 text-center">Show</span>
              <span className="w-16 text-center">Required</span>
            </div>
            <SortableList
              items={fields}
              getId={(f) => f.key}
              onReorder={(next) => setDraft(next)}
              className="divide-y divide-line"
              renderItem={(f, handle) => {
                const meta = fieldTypeMeta(f.type);
                return (
                  <div className={cn("flex items-center gap-2 bg-surface px-2 py-2.5 sm:px-3", !f.isEnabled && "bg-surface-muted/40")}>
                    {handle}
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", f.isEnabled ? "bg-brand-soft text-brand" : "bg-surface-muted text-muted")}>
                      <meta.icon className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 px-1">
                      <span className={cn("truncate text-sm font-medium", !f.isEnabled && "text-muted")}>{f.label}</span>
                      {f.isCustom && <Badge>Custom</Badge>}
                      {f.locked && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted" title="Always shown and required: WhatsApp identifies returning customers.">
                          <Lock className="size-3" /> Always required
                        </span>
                      )}
                    </div>
                    <span className="flex w-12 justify-center">
                      <Switch size="sm" checked={f.isEnabled} disabled={f.locked} onCheckedChange={(v) => patch(f.key, { isEnabled: v })} label={`Show ${f.label}`} />
                    </span>
                    <span className="flex w-16 justify-center">
                      <Switch
                        size="sm"
                        checked={f.isRequired}
                        disabled={f.locked || !f.isEnabled}
                        onCheckedChange={(v) => patch(f.key, { isRequired: v })}
                        label={`Require ${f.label}`}
                      />
                    </span>
                  </div>
                );
              }}
            />
          </Card>

          <DesktopPreview fields={fields.filter((f) => f.isEnabled)} />
        </>
      )}

      {/* Save bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 pl-5 shadow-pop backdrop-blur-xl lg:bottom-6"
            role="status"
          >
            <p className="flex-1 text-sm font-medium">You have unsaved changes</p>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={save.isPending}>
              Discard
            </Button>
            <Button size="sm" onClick={onSave} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * How the capture tool will look: it runs in Chrome beside WhatsApp Web, so the preview is a
 * desktop browser window with the tool's side panel on the right.
 */
function DesktopPreview({ fields }: { fields: CaptureField[] }) {
  return (
    <section className="mt-6" aria-label="Capture tool preview">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted">Preview</p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-hidden>
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-surface-muted/70 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex h-6 flex-1 items-center rounded-md bg-surface px-3 text-[11px] text-muted sm:max-w-sm">web.whatsapp.com</div>
        </div>

        <div className="flex h-[440px]">
          {/* WhatsApp Web, greyed out */}
          <div className="hidden flex-1 bg-[#efeae2] sm:flex">
            <div className="w-44 shrink-0 space-y-3 border-r border-black/5 bg-white/70 p-3 lg:w-56">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="size-7 shrink-0 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-3/4 rounded bg-slate-200" />
                    <div className="h-1.5 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2 p-4">
              <div className="h-7 w-2/5 rounded-lg rounded-tl-none bg-white shadow-sm" />
              <div className="ml-auto h-7 w-1/3 rounded-lg rounded-tr-none bg-[#d9fdd3] shadow-sm" />
              <div className="h-10 w-1/2 rounded-lg rounded-tl-none bg-white shadow-sm" />
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                <MessageCircle className="size-3" /> WhatsApp Web
              </div>
            </div>
          </div>

          {/* Capture tool panel */}
          <div className="flex w-full flex-col border-l border-line bg-surface sm:w-[300px] sm:shrink-0">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-accent text-[10px] font-bold text-white">G</span>
              <p className="text-sm font-semibold">Capture lead</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <motion.ul layout className="space-y-3">
                <AnimatePresence initial={false}>
                  {fields.map((f) => (
                    <motion.li
                      key={f.key}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                    >
                      <p className="mb-1 text-[11px] font-medium text-foreground/80">
                        {f.label}
                        {f.isRequired && <span className="ml-0.5 text-danger">*</span>}
                      </p>
                      <div className={cn("rounded-md border border-line bg-surface-muted/60", f.type === "textarea" ? "h-12" : "h-7")} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </div>
            <div className="border-t border-line p-3">
              <div className="flex h-8 items-center justify-center rounded-md bg-brand text-xs font-semibold text-white">Save lead</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
