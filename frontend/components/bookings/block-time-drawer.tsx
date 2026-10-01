"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarOff, Clock, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Switch } from "@/components/ui/form-controls";
import { toastError } from "@/lib/api/admin";
import { useCalendarBlockMutations } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/client";
import { formatDate, today } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import type { CalendarBlock } from "@/types/bookings";
import { formatTime, hhmm } from "./booking-status";

/** Describes a block's time: "All day" or "2:00 PM – 4:00 PM". */
export function blockTime(b: Pick<CalendarBlock, "startTime" | "endTime">) {
  return b.startTime && b.endTime ? `${formatTime(b.startTime)} – ${formatTime(b.endTime)}` : "All day";
}

/** "2 Oct 2026" or "2 Oct – 5 Oct 2026". */
export function blockDates(b: Pick<CalendarBlock, "startDate" | "endDate">) {
  return b.startDate === b.endDate ? formatDate(b.startDate) : `${formatDate(b.startDate)} – ${formatDate(b.endDate)}`;
}

interface Props {
  /** Open with a new block starting on this date ("yyyy-MM-dd"). */
  newOn: string | null;
  /** Or show this existing block. */
  block: CalendarBlock | null;
  canManage: boolean;
  onClose: () => void;
}

/** Mark time as not available, or look at (and remove) a block. Nothing can be booked over a block. */
export function BlockTimeDrawer({ newOn, block, canManage, onClose }: Props) {
  const open = newOn !== null || block !== null;
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={block ? "Not available" : "Block time"}
      description={
        block
          ? "Nobody can book this time, in GrowDesk or through the WhatsApp BOT."
          : "Mark time as not available, e.g. the doctor is away or the clinic is closed. Nothing can be booked over it."
      }
      footer={block ? <BlockFooter block={block} canManage={canManage} onDone={onClose} /> : <NewBlockFooter onCancel={onClose} />}
    >
      {block ? <BlockDetails block={block} /> : newOn !== null && <NewBlockForm key={newOn} date={newOn} onDone={onClose} />}
    </Drawer>
  );
}

// ---- Viewing ------------------------------------------------------------------------------------------

function BlockDetails({ block }: { block: CalendarBlock }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-muted/50 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-200/70 text-slate-600">
          <CalendarOff className="size-5" />
        </span>
        <div>
          <p className="font-semibold">{block.reason ?? "Not available"}</p>
          <p className="text-sm text-muted">{blockDates(block)}</p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm">
        <Clock className="size-4 text-muted" /> {blockTime(block)}
      </p>
      <p className="flex items-center gap-2 text-sm text-muted">
        <User className="size-4" /> Added {block.createdBy ? `by ${block.createdBy} ` : ""}on {formatDateTime(block.createdAt)}
      </p>
    </div>
  );
}

function BlockFooter({ block, canManage, onDone }: { block: CalendarBlock; canManage: boolean; onDone: () => void }) {
  const { remove } = useCalendarBlockMutations();
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <>
      <Button variant="secondary" onClick={onDone}>
        Close
      </Button>
      {canManage && (
        <Button
          variant={confirming ? "danger" : "secondary"}
          disabled={remove.isPending}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            remove.mutate(block.id, {
              onSuccess: () => {
                toast.success("The time is available again");
                onDone();
              },
              onError: toastError,
            });
          }}
        >
          <Trash2 className="size-4" /> {confirming ? "Click again to remove" : "Remove block"}
        </Button>
      )}
    </>
  );
}

// ---- Adding ---------------------------------------------------------------------------------------------

const FORM_ID = "block-time-form";

const schema = z
  .object({
    startDate: z.string().min(1, "Choose the first day."),
    endDate: z.string(),
    allDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    reason: z.string().trim().max(200, "Keep the reason under 200 characters."),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "The last day can't be before the first." });
    if (v.allDay) return;
    if (!v.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Choose a start time." });
    if (!v.endTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "Choose an end time." });
    else if (v.startTime && v.endTime <= v.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "End after the start time." });
  });
type Values = z.infer<typeof schema>;

function NewBlockFooter({ onCancel }: { onCancel: () => void }) {
  const { create } = useCalendarBlockMutations();
  return (
    <>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} disabled={create.isPending}>
        Block time
      </Button>
    </>
  );
}

function NewBlockForm({ date, onDone }: { date: string; onDone: () => void }) {
  const { create } = useCalendarBlockMutations();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { startDate: date || today(), endDate: "", allDay: true, startTime: "13:00", endTime: "14:00", reason: "" },
  });
  const allDay = useWatch({ control, name: "allDay" });

  const onSubmit = handleSubmit(async (v) => {
    try {
      const result = await create.mutateAsync({
        startDate: v.startDate,
        endDate: v.endDate || null,
        startTime: v.allDay ? null : v.startTime,
        endTime: v.allDay ? null : v.endTime,
        reason: v.reason || null,
      });
      toast.success("Time blocked");
      if (result.bookedConsultations > 0)
        toast.warning(
          `${result.bookedConsultations} consultation${result.bookedConsultations === 1 ? " is" : "s are"} already booked in this time. They stay booked: move or cancel them if needed.`,
          { duration: 8000 },
        );
      onDone();
    } catch (error) {
      const field = error instanceof ApiError ? error.fieldErrors[0]?.field : undefined;
      if (error instanceof ApiError && field && ["startDate", "endDate", "startTime", "endTime", "reason"].includes(field)) {
        setError(field as keyof Values, { message: error.message });
        return;
      }
      toastError(error);
    }
  });

  return (
    <form id={FORM_ID} onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" required error={errors.startDate?.message}>
          {(p) => <Input {...p} type="date" {...register("startDate")} />}
        </Field>
        <Field label="Until" optional hint="Leave empty for one day." error={errors.endDate?.message}>
          {(p) => <Input {...p} type="date" {...register("endDate")} />}
        </Field>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <span>
          <span className="block text-sm font-medium">All day</span>
          <span className="block text-xs text-muted">Turn off to block only part of each day.</span>
        </span>
        <Switch checked={allDay} onCheckedChange={(v) => setValue("allDay", v)} label="All day" />
      </label>

      {!allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" required error={errors.startTime?.message}>
            {(p) => <Input {...p} type="time" step={900} {...register("startTime", { setValueAs: (v: string) => (v ? hhmm(v) : v) })} />}
          </Field>
          <Field label="To" required error={errors.endTime?.message}>
            {(p) => <Input {...p} type="time" step={900} {...register("endTime", { setValueAs: (v: string) => (v ? hhmm(v) : v) })} />}
          </Field>
        </div>
      )}

      <Field label="Reason" optional hint="Shown on the calendar, e.g. Doctor away, Public holiday." error={errors.reason?.message}>
        {(p) => <Input {...p} placeholder="Doctor away" {...register("reason")} />}
      </Field>
    </form>
  );
}
