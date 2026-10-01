"use client";

import { CalendarCheck2, CalendarOff, Clock } from "lucide-react";
import { useMemo } from "react";
import { useBookings, useCalendarBlocks, useOpeningHours } from "@/lib/api/bookings";
import { formatDate } from "@/lib/dates";
import { openOn } from "@/lib/opening-hours";
import { cn } from "@/lib/utils";
import { blockTime } from "./block-time-drawer";
import { formatTime } from "./booking-status";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * The chosen day's booked consultations on the same calendar (doctor) and any time marked as not
 * available, with clashes with the chosen time highlighted, so double-booking is visible before
 * saving (spec §20). Also notes when the time falls outside opening hours (allowed for staff).
 */
export function DaySchedule({
  date,
  startTime,
  endTime,
  doctorId,
  excludeId,
}: {
  date: string;
  startTime: string;
  endTime: string;
  doctorId: number | null;
  /** The booking being rescheduled: its own slot is not a clash. */
  excludeId?: number;
}) {
  const { data, isFetching } = useBookings({ from: date, to: date, status: "Booked", pageSize: 100 }, !!date);
  const blocks = useCalendarBlocks(date || undefined, date || undefined);
  const hours = useOpeningHours();
  const sameCalendar = useMemo(
    () => (data?.items ?? []).filter((b) => (b.doctor?.id ?? null) === doctorId && b.id !== excludeId),
    [data, doctorId, excludeId],
  );

  if (!date) return null;
  const s = startTime ? toMinutes(startTime) : -1;
  const e = endTime ? toMinutes(endTime) : -1;
  const open = openOn(hours.data, date);
  const outside =
    hours.data && s >= 0 && e > s && (!open || s < toMinutes(open.from) || e > toMinutes(open.to))
      ? open
        ? `Outside opening hours (${formatTime(open.from)} – ${formatTime(open.to)}).`
        : "The clinic is closed on this day."
      : null;
  const dayBlocks = blocks.data ?? [];

  return (
    <div className="rounded-xl bg-surface-muted/60 p-3.5">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
        <CalendarCheck2 className="size-3.5" /> {formatDate(date)}
        {isFetching && <span className="size-1.5 animate-pulse rounded-full bg-brand" />}
      </p>
      {outside && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
          <Clock className="size-3.5 shrink-0" /> {outside}
        </p>
      )}
      {dayBlocks.length > 0 && (
        <ul className="mb-1.5 space-y-1.5">
          {dayBlocks.map((b) => {
            const bs = b.startTime ? toMinutes(b.startTime) : 0;
            const be = b.endTime ? toMinutes(b.endTime) : 24 * 60;
            const clash = s >= 0 && e > s && bs < e && s < be;
            return (
              <li
                key={b.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                  clash ? "bg-red-50 font-semibold text-danger ring-1 ring-red-200" : "bg-surface text-muted",
                )}
              >
                <span className="flex items-center gap-1.5 tabular-nums">
                  <CalendarOff className="size-3.5 shrink-0" /> {blockTime(b)}
                </span>
                <span className="truncate">{b.reason ?? "Not available"}</span>
                {clash && <span className="shrink-0">Blocked</span>}
              </li>
            );
          })}
        </ul>
      )}
      {sameCalendar.length === 0 ? (
        dayBlocks.length === 0 && <p className="text-xs text-muted">Nothing else booked. The day is clear.</p>
      ) : (
        <ul className="space-y-1.5">
          {sameCalendar.map((b) => {
            const clash = s >= 0 && e > s && toMinutes(b.startTime) < e && s < toMinutes(b.endTime);
            return (
              <li
                key={b.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                  clash ? "bg-red-50 font-semibold text-danger ring-1 ring-red-200" : "bg-surface",
                )}
              >
                <span className="tabular-nums">
                  {formatTime(b.startTime)} – {formatTime(b.endTime)}
                </span>
                <span className="truncate">{b.customer.name}</span>
                {clash && <span className="shrink-0">Overlaps</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
