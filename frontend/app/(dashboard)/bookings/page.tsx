"use client";

import { motion } from "framer-motion";
import { CalendarX2, CircleAlert, Download, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BookingDetailsDrawer } from "@/components/bookings/booking-details-drawer";
import { BookingFormDrawer } from "@/components/bookings/booking-form-drawer";
import { BookingStatusBadge, formatMoney, formatTime } from "@/components/bookings/booking-status";
import { TreatmentChips } from "@/components/customers/stage-badge";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toastError } from "@/lib/api/admin";
import { useBookings, useDoctorOptions, useLocale } from "@/lib/api/bookings";
import { downloadFile } from "@/lib/api/client";
import { useActiveLookup } from "@/lib/api/customers";
import { useSession } from "@/lib/auth/session";
import { formatDate, today, type DateRange } from "@/lib/dates";
import { can, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { BookingListItem, BookingQuery } from "@/types/bookings";

const PAGE_SIZE = 25;

const TABS = [
  { id: "upcoming", label: "Upcoming", empty: "No upcoming consultations", hint: "Booked consultations from today onwards appear here." },
  { id: "today", label: "Today", empty: "No consultations today", hint: "Your calendar is clear." },
  { id: "history", label: "History", empty: "No past consultations", hint: "Completed, cancelled, rescheduled and no-show consultations appear here." },
] as const;
type Tab = (typeof TABS)[number]["id"];

function queryFor(tab: Tab, t: string): BookingQuery {
  switch (tab) {
    case "upcoming":
      return { from: t, status: "Booked", sort: "asc" };
    case "today":
      return { from: t, to: t, sort: "asc" };
    case "history":
      return { to: t, sort: "desc" };
  }
}

/** History's own filters (spec: history must be filterable and exportable). */
interface HistoryFilters {
  search: string;
  range: DateRange;
  status?: string;
  treatment?: string;
  payment?: string;
}

const NO_HISTORY_FILTERS: HistoryFilters = { search: "", range: {} };

function historyQuery(f: HistoryFilters, t: string, doctor: string | undefined): BookingQuery {
  return {
    from: f.range.from,
    to: f.range.to ?? (f.range.from ? undefined : t),
    status: f.status,
    treatmentId: f.treatment ? Number(f.treatment) : undefined,
    paymentStatus: f.payment,
    search: f.search.trim() || undefined,
    doctorId: doctor ? Number(doctor) : undefined,
    sort: "desc",
  };
}

function toQueryString(q: object) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  return p.toString();
}


export default function BookingsPage() {
  const { data: session } = useSession();
  const { data: locale } = useLocale();
  const canBook = can(session?.user, Permission.BookingsManage);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [page, setPage] = useState(1);
  const [doctor, setDoctor] = useState<string | undefined>();
  const [openId, setOpenId] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [history, setHistory] = useState<HistoryFilters>(NO_HISTORY_FILTERS);
  const [exporting, setExporting] = useState(false);
  const doctors = useDoctorOptions();
  const treatments = useActiveLookup("treatments");
  const canSeePayments = can(session?.user, Permission.PaymentsView);
  const search = useDebouncedValue(history.search, 300);

  const t = locale?.today ?? today();
  const isHistory = tab === "history";
  const query = isHistory
    ? historyQuery({ ...history, search }, t, doctor)
    : { ...queryFor(tab, t), doctorId: doctor ? Number(doctor) : undefined };
  const { data, isPending, isError, isFetching, refetch } = useBookings({ ...query, page, pageSize: PAGE_SIZE });

  const setHistoryFilter = (patch: Partial<HistoryFilters>) => {
    setHistory((h) => ({ ...h, ...patch }));
    setPage(1);
  };
  const historyFiltered =
    !!history.search || !!history.range.from || !!history.range.to || !!history.status || !!history.treatment || !!history.payment;

  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadFile(`/bookings/export?${toQueryString(historyQuery({ ...history, search }, t, doctor))}`, "bookings.xlsx");
      toast.success(`Exported ${data?.totalCount ?? ""} bookings to Excel`);
    } catch (error) {
      toastError(error);
    } finally {
      setExporting(false);
    }
  };
  const meta = TABS.find((x) => x.id === tab)!;

  return (
    <RequirePermission permission={Permission.BookingsView}>
      <PageHeader
        title="Bookings"
        description="Book, complete, reschedule and cancel consultations."
        actions={
          canBook && (
            <Button onClick={() => setBooking(true)}>
              <Plus className="size-4" /> Book consultation
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="inline-flex rounded-xl bg-surface-muted p-1 text-sm font-medium" role="tablist" aria-label="Bookings">
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={tab === x.id}
                onClick={() => {
                  setTab(x.id);
                  setPage(1);
                }}
                className={cn("relative rounded-lg px-4 py-1.5 transition-colors", tab === x.id ? "text-foreground" : "text-muted hover:text-foreground")}
              >
                {tab === x.id && (
                  <motion.span layoutId="bookings-tab" className="absolute inset-0 rounded-lg bg-surface shadow-card" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                )}
                <span className="relative">{x.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isPending && <span className="size-2 animate-pulse rounded-full bg-brand" aria-label="Loading" />}
            {doctors.data && doctors.data.length > 0 && (
              <FilterMenu
                label="Doctor"
                value={doctor}
                onChange={(v) => {
                  setDoctor(v);
                  setPage(1);
                }}
                options={doctors.data.map((d) => ({ value: String(d.id), label: d.name }))}
              />
            )}
          </div>
        </div>

        {isHistory && (
          <div className="flex flex-col gap-3 border-b border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={history.search}
                onChange={(v) => setHistoryFilter({ search: v })}
                placeholder="Search by customer name or number…"
                className="flex-1 sm:max-w-sm"
              />
              <Button variant="secondary" onClick={exportExcel} disabled={exporting || !data || data.totalCount === 0}>
                <Download className="size-4" />
                {exporting ? "Exporting…" : `Export to Excel${data ? ` (${data.totalCount.toLocaleString()})` : ""}`}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeFilter value={history.range} onChange={(range) => setHistoryFilter({ range })} />
              <FilterMenu
                label="Status"
                value={history.status}
                onChange={(v) => setHistoryFilter({ status: v })}
                options={[
                  { value: "Completed", label: "Completed" },
                  { value: "Booked", label: "Booked" },
                  { value: "Rescheduled", label: "Rescheduled" },
                  { value: "Cancelled", label: "Cancelled" },
                  { value: "NoShow", label: "No-show" },
                ]}
              />
              <FilterMenu
                label="Treatment"
                value={history.treatment}
                onChange={(v) => setHistoryFilter({ treatment: v })}
                options={treatments.data?.map((x) => ({ value: String(x.id), label: x.name })) ?? []}
              />
              {canSeePayments && (
                <FilterMenu
                  label="Payment"
                  value={history.payment}
                  onChange={(v) => setHistoryFilter({ payment: v })}
                  options={[
                    { value: "Paid", label: "Paid" },
                    { value: "Pending", label: "Pending" },
                    { value: "Waived", label: "Waived" },
                  ]}
                />
              )}
              {historyFiltered && (
                <button type="button" onClick={() => { setHistory(NO_HISTORY_FILTERS); setPage(1); }} className="px-2 text-sm font-medium text-muted hover:text-foreground">
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {isPending ? (
          <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-10 w-16 rounded-xl" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={CircleAlert}
            title="Couldn't load bookings"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                <RotateCcw className="size-4" /> Try again
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title={isHistory && historyFiltered ? "No bookings match these filters" : meta.empty}
            description={isHistory && historyFiltered ? "Try widening the date range or clearing a filter." : meta.hint}
            action={
              canBook &&
              tab !== "history" && (
                <Button onClick={() => setBooking(true)}>
                  <Plus className="size-4" /> Book consultation
                </Button>
              )
            }
            className="py-16"
          />
        ) : (
          <div className={cn("transition-opacity", isFetching && "opacity-70")}>
            <ul className="divide-y divide-line">
              {data.items.map((b, i) => (
                <BookingRow key={b.id} b={b} index={i} currency={locale?.currency} onOpen={() => setOpenId(b.id)} />
              ))}
            </ul>
            <Pagination page={data.page} pageSize={PAGE_SIZE} totalCount={data.totalCount} onPageChange={setPage} noun="bookings" />
          </div>
        )}
      </Card>

      <BookingDetailsDrawer bookingId={openId} onClose={() => setOpenId(null)} onBookingChange={setOpenId} />
      <BookingFormDrawer open={booking} onClose={() => setBooking(false)} onSaved={(b) => setOpenId(b.id)} />
    </RequirePermission>
  );
}

function BookingRow({ b, index, currency, onOpen }: { b: BookingListItem; index: number; currency?: string; onOpen: () => void }) {
  const [, month, day] = b.date.split("-");
  const monthName = new Date(2000, Number(month) - 1, 1).toLocaleString(undefined, { month: "short" });
  return (
    <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index, 10) * 0.02 }}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-brand-soft/40">
        <span className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-line bg-surface py-1.5">
          <span className="text-[10px] font-semibold uppercase text-muted">{monthName}</span>
          <span className="font-display text-lg font-bold leading-none">{Number(day)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{b.customer.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted">
            {formatDate(b.date)} · {formatTime(b.startTime)} – {formatTime(b.endTime)}
            {b.doctor && ` · ${b.doctor.name}`}
          </p>
          <div className="mt-1.5 md:hidden">
            <TreatmentChips treatments={b.treatments} max={3} />
          </div>
        </div>
        <div className="hidden w-64 md:block">
          <TreatmentChips treatments={b.treatments} max={2} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <BookingStatusBadge status={b.status} />
          {b.status === "Completed" && b.consultationCharge !== null && (
            <span className="text-xs text-muted">
              {formatMoney(b.consultationCharge, currency)}
              {b.paymentStatus && b.paymentStatus !== "Paid" && ` · ${b.paymentStatus}`}
            </span>
          )}
        </div>
      </button>
    </motion.li>
  );
}
