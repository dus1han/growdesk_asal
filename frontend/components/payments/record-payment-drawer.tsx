"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { formatMoney } from "@/components/bookings/booking-status";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { toastError } from "@/lib/api/admin";
import { useLocale } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/client";
import { useActiveLookup } from "@/lib/api/customers";
import { useRecordPayment } from "@/lib/api/payments";
import { today } from "@/lib/dates";

export interface PendingPayment {
  bookingId: number;
  customerName: string;
  amount: number;
}

const schema = z.object({
  paymentMethodId: z.number({ error: "Choose how the customer paid." }).int().positive("Choose how the customer paid."),
  paymentDate: z.string().min(1, "Choose the payment date."),
});
type FormValues = z.infer<typeof schema>;

/** Settles a pending consultation payment. The pending entry stays in the history. */
export function RecordPaymentDrawer({ pending, onClose }: { pending: PendingPayment | null; onClose: () => void }) {
  const record = useRecordPayment();
  return (
    <Drawer
      open={pending !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Record payment"
      description={pending ? `${pending.customerName}'s consultation` : undefined}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="record-payment-form" disabled={record.isPending}>
            {record.isPending ? "Saving…" : "Record payment"}
          </Button>
        </>
      }
    >
      {pending && <RecordPaymentForm key={pending.bookingId} pending={pending} onClose={onClose} />}
    </Drawer>
  );
}

function RecordPaymentForm({ pending, onClose }: { pending: PendingPayment; onClose: () => void }) {
  const record = useRecordPayment();
  const methods = useActiveLookup("payment-methods");
  const { data: locale } = useLocale();
  const max = locale?.today ?? today();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { paymentDate: max } });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await record.mutateAsync({ bookingId: pending.bookingId, paymentMethodId: v.paymentMethodId, paymentDate: v.paymentDate });
      toast.success(`${formatMoney(pending.amount, locale?.currency)} received from ${pending.customerName}`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        for (const fe of error.fieldErrors) if (fe.field) setError(fe.field as keyof FormValues, { message: fe.message });
        return;
      }
      toastError(error);
    }
  });

  return (
    <form id="record-payment-form" onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-amber-700">Pending</p>
        <p className="mt-1 font-display text-2xl font-bold">{formatMoney(pending.amount, locale?.currency)}</p>
      </div>
      <Field label="Payment method" required error={errors.paymentMethodId?.message}>
        {(p) => (
          <Select {...p} autoFocus {...register("paymentMethodId", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
            <option value="">Choose…</option>
            {methods.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Paid on" required error={errors.paymentDate?.message}>
        {(p) => <Input {...p} type="date" max={max} {...register("paymentDate")} />}
      </Field>
    </form>
  );
}
