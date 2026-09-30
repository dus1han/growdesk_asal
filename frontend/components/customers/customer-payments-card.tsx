"use client";

import { formatMoney } from "@/components/bookings/booking-status";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePayments, usePaymentSummary } from "@/lib/api/payments";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  Paid: "text-emerald-700",
  Pending: "text-amber-700",
  Waived: "text-slate-500",
};

/** The customer's payment history (spec §28): totals, then each entry, newest first. */
export function CustomerPaymentsCard({ customerId, onOpenBooking }: { customerId: number; onOpenBooking: (id: number) => void }) {
  const summary = usePaymentSummary({ customerId });
  const list = usePayments({ customerId, currentOnly: false, pageSize: 50 });
  const currency = summary.data?.currency ?? "AED";

  return (
    <Card className="self-start">
      <CardHeader title="Payments" />
      <div className="p-5">
        {summary.isPending || list.isPending ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !list.data || list.data.items.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50/70 p-3">
                <p className="text-xs font-medium text-emerald-700">Paid</p>
                <p className="mt-0.5 font-display text-lg font-bold">{formatMoney(summary.data?.collected ?? 0, currency)}</p>
              </div>
              <div className={cn("rounded-xl p-3", (summary.data?.outstanding ?? 0) > 0 ? "bg-amber-50/80" : "bg-surface-muted")}>
                <p className="text-xs font-medium text-amber-700">Outstanding</p>
                <p className="mt-0.5 font-display text-lg font-bold">{formatMoney(summary.data?.outstanding ?? 0, currency)}</p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {list.data.items.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpenBooking(p.booking.id)}
                    className={cn("flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-brand-strong", !p.isCurrent && "opacity-60")}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{formatDate(p.createdAt.slice(0, 10))}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.booking.treatments.join(" + ")}
                        {p.method && ` · ${p.method.name}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums">{formatMoney(p.amount, currency)}</span>
                      <span className={cn("block text-[11px] font-semibold", STATUS_STYLE[p.status])}>
                        {p.status}
                        {!p.isCurrent && " · settled"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
