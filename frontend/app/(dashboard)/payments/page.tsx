"use client";

import { motion } from "framer-motion";
import { Ban, CircleAlert, Download, HandCoins, Hourglass, RotateCcw, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BookingDetailsDrawer } from "@/components/bookings/booking-details-drawer";
import { formatMoney, formatTime } from "@/components/bookings/booking-status";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { RecordPaymentDrawer, type PendingPayment } from "@/components/payments/record-payment-drawer";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Switch } from "@/components/ui/form-controls";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toastError } from "@/lib/api/admin";
import { downloadFile } from "@/lib/api/client";
import { useActiveLookup } from "@/lib/api/customers";
import { paymentQueryString, usePayments, usePaymentSummary } from "@/lib/api/payments";
import { useSession } from "@/lib/auth/session";
import { formatDate, type DateRange } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { can, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { PaymentListItem, PaymentQuery } from "@/types/payments";

const PAGE_SIZE = 25;

const STATUS_STYLE: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Waived: "bg-slate-100 text-slate-600",
};

export default function PaymentsPage() {
  const { data: session } = useSession();
  const canRecord = can(session?.user, Permission.PaymentsManage);
  const methods = useActiveLookup("payment-methods");

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>({});
  const [status, setStatus] = useState<string | undefined>();
  const [method, setMethod] = useState<string | undefined>();
  const [allEntries, setAllEntries] = useState(false);
  const [page, setPage] = useState(1);
  const [openBooking, setOpenBooking] = useState<number | null>(null);
  const [recording, setRecording] = useState<PendingPayment | null>(null);
  const [exporting, setExporting] = useState(false);
  const debounced = useDebouncedValue(search, 300);

  const query: PaymentQuery = {
    search: debounced.trim() || undefined,
    from: range.from,
    to: range.to,
    status,
    paymentMethodId: method ? Number(method) : undefined,
    currentOnly: allEntries ? false : undefined,
  };
  const reset = () => setPage(1);
  const { data, isPending, isError, isFetching, refetch } = usePayments({ ...query, page, pageSize: PAGE_SIZE });
  const summary = usePaymentSummary(query);
  const currency = summary.data?.currency ?? "AED";
  const money = useCallback((n: number) => formatMoney(n, currency), [currency]);
  const filtered = !!(debounced || range.from || range.to || status || method);

  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadFile(`/payments/export?${paymentQueryString(query)}`, "payments.xlsx");
      toast.success(`Exported ${data?.totalCount ?? ""} payments to Excel`);
    } catch (error) {
      toastError(error);
    } finally {
      setExporting(false);
    }
  };

  const cards = [
    {
      label: range.from || range.to ? "Collected in period" : "Collected",
      value: summary.data?.collected,
      count: summary.data?.collectedCount,
      icon: HandCoins,
      tint: "from-emerald-500/15 text-emerald-600",
    },
    {
      label: "Outstanding now",
      value: summary.data?.outstanding,
      count: summary.data?.outstandingCount,
      icon: Hourglass,
      tint: "from-amber-500/15 text-amber-600",
    },
    {
      label: range.from || range.to ? "Waived in period" : "Waived",
      value: summary.data?.waived,
      count: summary.data?.waivedCount,
      icon: Ban,
      tint: "from-slate-400/15 text-slate-500",
    },
  ];

  return (
    <RequirePermission permission={Permission.PaymentsView}>
      <PageHeader title="Payments" description="Consultation charges and what has been collected." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, count, icon: Icon, tint }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="relative overflow-hidden p-5">
              <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent", tint.split(" ")[0])} aria-hidden />
              <div className="relative flex items-start justify-between">
                <p className="text-sm font-medium text-muted">{label}</p>
                <span className={cn("flex size-9 items-center justify-center rounded-xl bg-surface shadow-card", tint.split(" ")[1])}>
                  <Icon className="size-[18px]" />
                </span>
              </div>
              {value === undefined ? (
                <Skeleton className="relative mt-4 h-8 w-32" />
              ) : (
                <p className="relative mt-3 font-display text-3xl font-bold tracking-tight">
                  <AnimatedNumber value={value} format={money} />
                </p>
              )}
              <p className="relative mt-1 text-xs text-muted">{count !== undefined ? `${count} consultation${count === 1 ? "" : "s"}` : " "}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); reset(); }} placeholder="Search by customer name or number…" className="flex-1 sm:max-w-sm" />
            <div className="flex items-center gap-2">
              {isFetching && !isPending && <span className="size-2 animate-pulse rounded-full bg-brand" aria-label="Loading" />}
              <Button variant="secondary" onClick={exportExcel} disabled={exporting || !data || data.totalCount === 0}>
                <Download className="size-4" />
                {exporting ? "Exporting…" : `Export to Excel${data ? ` (${data.totalCount.toLocaleString()})` : ""}`}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={range} onChange={(r) => { setRange(r); reset(); }} />
            <FilterMenu
              label="Status"
              value={status}
              onChange={(v) => { setStatus(v); reset(); }}
              options={[
                { value: "Paid", label: "Paid" },
                { value: "Pending", label: "Pending" },
                { value: "Waived", label: "Waived" },
              ]}
            />
            <FilterMenu
              label="Method"
              value={method}
              onChange={(v) => { setMethod(v); reset(); }}
              options={methods.data?.map((m) => ({ value: String(m.id), label: m.name })) ?? []}
            />
            <label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted" title="Show every entry, including pending entries that were later paid">
              <Switch size="sm" checked={allEntries} onCheckedChange={(v) => { setAllEntries(v); reset(); }} label="Show full history" />
              Full history
            </label>
          </div>
        </div>

        {isPending ? (
          <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-5 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load payments"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RotateCcw className="size-4" /> Try again
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={filtered ? "No payments match these filters" : "No payments yet"}
            description={filtered ? "Try widening the date range or clearing a filter." : "Payments are recorded when a consultation is completed."}
            className="py-16"
          />
        ) : (
          <div className={cn("transition-opacity", isFetching && "opacity-70")}>
            <ul className="divide-y divide-line">
              {data.items.map((p, i) => (
                <PaymentRow
                  key={p.id}
                  p={p}
                  index={i}
                  currency={currency}
                  onOpen={() => setOpenBooking(p.booking.id)}
                  onRecord={
                    canRecord && p.status === "Pending" && p.isCurrent
                      ? () => setRecording({ bookingId: p.booking.id, customerName: p.customer.name, amount: p.amount })
                      : undefined
                  }
                />
              ))}
            </ul>
            <Pagination page={data.page} pageSize={PAGE_SIZE} totalCount={data.totalCount} onPageChange={setPage} noun="payments" />
          </div>
        )}
      </Card>

      <BookingDetailsDrawer bookingId={openBooking} onClose={() => setOpenBooking(null)} onBookingChange={setOpenBooking} />
      <RecordPaymentDrawer pending={recording} onClose={() => setRecording(null)} />
    </RequirePermission>
  );
}

function PaymentRow({
  p,
  index,
  currency,
  onOpen,
  onRecord,
}: {
  p: PaymentListItem;
  index: number;
  currency: string;
  onOpen: () => void;
  onRecord?: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index, 10) * 0.02 }}
      className={cn("flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-brand-soft/40", !p.isCurrent && "opacity-60")}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.customer.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            Consultation {formatDate(p.booking.date)}, {formatTime(p.booking.startTime)} · {p.booking.treatments.join(" + ")}
          </p>
        </div>
        <div className="hidden text-right text-xs text-muted sm:block">
          <p>{p.method?.name ?? (p.status === "Waived" ? "Waived" : "—")}</p>
          <p title={formatDateTime(p.createdAt)}>{formatDate(p.createdAt.slice(0, 10))}</p>
        </div>
        <div className="w-28 text-right">
          <p className={cn("font-display font-bold tabular-nums", p.status === "Waived" && "text-muted line-through")}>{formatMoney(p.amount, currency)}</p>
          <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[p.status])}>
            {p.status}
            {!p.isCurrent && " · settled"}
          </span>
        </div>
      </button>
      {onRecord && (
        <Button size="sm" onClick={onRecord}>
          Record payment
        </Button>
      )}
    </motion.li>
  );
}
