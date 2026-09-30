"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, CircleAlert, ClipboardType, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FIELD_TYPE_META } from "@/components/admin/field-types";
import { SortableList } from "@/components/admin/sortable-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, Field, Input, Switch } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, useCustomFieldMutations, useCustomFieldsAdmin } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { CUSTOM_FIELD_TYPES, type CustomField, type CustomFieldType } from "@/types/admin";

const OPTION_TYPES: CustomFieldType[] = ["Dropdown", "MultiSelect"];

const schema = z
  .object({
    label: z.string().trim().min(1, "Please enter a field name.").max(100),
    fieldType: z.enum(CUSTOM_FIELD_TYPES),
    isRequired: z.boolean(),
    // "optionId", not "id": useFieldArray reserves "id" for its own row keys.
    options: z.array(z.object({ optionId: z.number().nullable(), label: z.string().trim().max(100) })),
  })
  .superRefine((v, ctx) => {
    if (!OPTION_TYPES.includes(v.fieldType)) return;
    if (v.options.length === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least one option." });
    const seen = new Set<string>();
    v.options.forEach((o, i) => {
      if (!o.label) ctx.addIssue({ code: "custom", path: ["options", i, "label"], message: "Give this option a name." });
      else if (seen.has(o.label.toLowerCase())) ctx.addIssue({ code: "custom", path: ["options", i, "label"], message: "Already listed." });
      seen.add(o.label.toLowerCase());
    });
  });
type FormValues = z.infer<typeof schema>;

export default function CustomFieldsPage() {
  const { data: fields, isPending, isError, refetch } = useCustomFieldsAdmin();
  const { setActive, reorder } = useCustomFieldMutations();
  const [editing, setEditing] = useState<CustomField | "new" | null>(null);

  return (
    <>
      <PageHeader
        title="Custom Fields"
        description="Extra details to keep on every customer. New fields can also be added to the capture tool."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add field
          </Button>
        }
      />

      <Card>
        {isPending ? (
          <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load custom fields"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RotateCcw className="size-4" /> Try again
              </Button>
            }
          />
        ) : fields.length === 0 ? (
          <EmptyState
            icon={ClipboardType}
            title="No custom fields yet"
            description="Add fields such as preferred branch, date of birth or referral name. They appear on every customer."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus className="size-4" /> Add field
              </Button>
            }
          />
        ) : (
          <SortableList
            items={fields}
            getId={(f) => f.id}
            onReorder={(next) => reorder.mutate(next.map((f) => f.id))}
            className="divide-y divide-line"
            renderItem={(f, handle) => {
              const meta = FIELD_TYPE_META[f.fieldType];
              return (
                <div className={cn("flex items-center gap-2 bg-surface px-2 py-3 sm:px-3", !f.isActive && "bg-surface-muted/40")}>
                  {handle}
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", f.isActive ? "bg-brand-soft text-brand" : "bg-surface-muted text-muted")}>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 px-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("truncate text-sm font-medium", !f.isActive && "text-muted")}>{f.label}</p>
                      <Badge>{meta.label}</Badge>
                      {f.isRequired && <Badge tone="warning">Required</Badge>}
                      {!f.isActive && <Badge tone="muted">Inactive</Badge>}
                    </div>
                    {f.options.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {f.options.slice(0, 4).map((o) => o.label).join(" · ")}
                        {f.options.length > 4 && ` · +${f.options.length - 4} more`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(f)}
                    aria-label={`Edit ${f.label}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <Switch
                    checked={f.isActive}
                    onCheckedChange={(isActive) =>
                      setActive.mutate(
                        { id: f.id, isActive },
                        { onSuccess: () => toast.success(`${f.label} ${isActive ? "activated" : "deactivated"}`) },
                      )
                    }
                    label={f.isActive ? `Deactivate ${f.label}` : `Activate ${f.label}`}
                  />
                </div>
              );
            }}
          />
        )}
      </Card>

      <FieldDrawer key={editing === "new" ? "new" : editing?.id ?? "closed"} field={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function FieldDrawer({ field, onClose }: { field: CustomField | "new" | null; onClose: () => void }) {
  const existing = field !== "new" ? field : null;
  const { create, update } = useCustomFieldMutations();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: existing?.label ?? "",
      fieldType: existing?.fieldType ?? "Text",
      isRequired: existing?.isRequired ?? false,
      options: existing?.options.map((o) => ({ optionId: o.id, label: o.label })) ?? [],
    },
  });
  const { fields: options, append, remove, move } = useFieldArray({ control, name: "options" });
  const fieldType = useWatch({ control, name: "fieldType" });
  const isRequired = useWatch({ control, name: "isRequired" });
  const needsOptions = OPTION_TYPES.includes(fieldType);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      label: values.label,
      fieldType: values.fieldType,
      isRequired: values.isRequired,
      options: needsOptions ? values.options.map((o) => ({ id: o.optionId, label: o.label })) : null,
    };
    try {
      if (existing) await update.mutateAsync({ id: existing.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(existing ? `${values.label} saved` : `${values.label} added`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const fe of error.fieldErrors) {
          if (fe.field === "label" || fe.field === "fieldType" || fe.field === "options") setError(fe.field, { message: fe.message });
        }
      }
      toastError(error);
    }
  });

  return (
    <Drawer
      open={field !== null}
      onOpenChange={(open) => !open && onClose()}
      title={existing ? "Edit field" : "Add field"}
      description={existing ? `Key: ${existing.key}` : "Customers get this field on their profile. Capture tool visibility is set separately."}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="field-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : existing ? "Save changes" : "Add field"}
          </Button>
        </>
      }
    >
      <form id="field-form" onSubmit={onSubmit} className="space-y-6" noValidate>
        <Field label="Field name" hint="As staff will see it, e.g. Preferred Branch." error={errors.label?.message}>
          {(p) => <Input {...p} autoFocus autoComplete="off" {...register("label")} />}
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Type</legend>
          {existing && <p className="mb-2 text-xs text-muted">The type can’t be changed after a field is created.</p>}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Field type">
            {CUSTOM_FIELD_TYPES.map((t) => {
              const meta = FIELD_TYPE_META[t];
              const selected = fieldType === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!existing && !selected}
                  onClick={() => {
                    setValue("fieldType", t, { shouldValidate: false });
                    if (OPTION_TYPES.includes(t) && options.length === 0) append({ optionId: null, label: "" });
                  }}
                  title={meta.hint}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
                    selected ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-muted hover:border-slate-300 hover:text-foreground",
                  )}
                >
                  <meta.icon className="size-[18px]" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <AnimatePresence initial={false}>
          {needsOptions && (
            <motion.fieldset
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <legend className="mb-1.5 text-[13px] font-medium">Options</legend>
              {existing && <p className="mb-2 text-xs text-muted">Removed options stay on customers who already chose them.</p>}
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {options.map((opt, i) => (
                    <motion.li
                      key={opt.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Input
                          aria-label={`Option ${i + 1}`}
                          aria-invalid={!!errors.options?.[i]?.label}
                          placeholder={`Option ${i + 1}`}
                          autoComplete="off"
                          {...register(`options.${i}.label`)}
                        />
                        <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted disabled:opacity-30">
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" onClick={() => move(i, i + 1)} disabled={i === options.length - 1} aria-label="Move down" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted disabled:opacity-30">
                          <ArrowDown className="size-4" />
                        </button>
                        <button type="button" onClick={() => remove(i)} aria-label={`Remove option ${i + 1}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-danger">
                          <X className="size-4" />
                        </button>
                      </div>
                      {errors.options?.[i]?.label && <p className="mt-1 text-xs text-danger">{errors.options[i]?.label?.message}</p>}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              {errors.options?.message && <p className="mt-1.5 text-xs text-danger">{errors.options.message}</p>}
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => append({ optionId: null, label: "" })}>
                <Plus className="size-3.5" /> Add option
              </Button>
            </motion.fieldset>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
          <div>
            <p className="text-sm font-medium">Required</p>
            <p className="text-xs text-muted">Customers can’t be saved without it.</p>
          </div>
          <Switch checked={isRequired} onCheckedChange={(v) => setValue("isRequired", v, { shouldDirty: true })} label="Required" />
        </div>
      </form>
    </Drawer>
  );
}
