"use client";

import { CalendarCheck2 } from "lucide-react";
import { useMemo } from "react";
import { useBookings } from "@/lib/api/bookings";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { formatTime } from "./booking-status";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * The chosen day's booked consultations on the same calendar (doctor), with any clash with the
 * chosen time highlighted, so double-booking is visible before saving (spec §20).
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
  const sameCalendar = useMemo(
    () => (data?.items ?? []).filter((b) => (b.doctor?.id ?? null) === doctorId && b.id !== excludeId),
    [data, doctorId, excludeId],
  );

  if (!date) return null;
  const s = startTime ? toMinutes(startTime) : -1;
  const e = endTime ? toMinutes(endTime) : -1;

  return (
    <div className="rounded-xl bg-surface-muted/60 p-3.5">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
        <CalendarCheck2 className="size-3.5" /> {formatDate(date)}
        {isFetching && <span className="size-1.5 animate-pulse rounded-full bg-brand" />}
      </p>
      {sameCalendar.length === 0 ? (
        <p className="text-xs text-muted">Nothing else booked. The day is clear.</p>
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
