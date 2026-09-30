"use client";

import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Switch } from "@/components/ui/form-controls";
import { useBookings, useDoctorOptions } from "@/lib/api/bookings";
import { isoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { BookingListItem } from "@/types/bookings";
import { BOOKING_STATUS, hhmm } from "./booking-status";

const VIEWS = [
  { id: "timeGridWeek", label: "Week" },
  { id: "timeGridDay", label: "Day" },
  { id: "dayGridMonth", label: "Month" },
  { id: "listWeek", label: "Agenda" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

interface Props {
  onOpenBooking: (id: number) => void;
  /** Called when an empty slot is clicked (only when the user may book). */
  onPickSlot?: (slot: { date: string; startTime: string; endTime: string }) => void;
}

export function BookingCalendar({ onOpenBooking, onPickSlot }: Props) {
  const ref = useRef<FullCalendar>(null);
  // Phones start on the day view; a week of columns is unreadable at 390px.
  const [view, setView] = useState<ViewId>(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "timeGridDay" : "timeGridWeek",
  );
  const [title, setTitle] = useState("");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [doctor, setDoctor] = useState<string | undefined>();
  const doctors = useDoctorOptions();

  const { data, isFetching } = useBookings(
    {
      from: range?.from,
      to: range?.to,
      doctorId: doctor ? Number(doctor) : undefined,
      status: showInactive ? undefined : "Booked,Completed,NoShow",
      pageSize: 500,
    },
    range !== null,
  );

  const events = useMemo<EventInput[]>(
    () =>
      (data?.items ?? []).map((b) => {
        const s = BOOKING_STATUS[b.status];
        return {
          id: String(b.id),
          title: b.customer.name,
          start: `${b.date}T${hhmm(b.startTime)}`,
          end: `${b.date}T${hhmm(b.endTime)}`,
          backgroundColor: s.muted ? "transparent" : `${s.color}1f`,
          borderColor: s.color,
          textColor: "#0f172a",
          classNames: [`gd-event-${b.status.toLowerCase()}`],
          extendedProps: { booking: b },
        };
      }),
    [data],
  );

  const api = () => ref.current?.getApi();
  const changeView = (v: ViewId) => {
    setView(v);
    api()?.changeView(v);
  };

  const onDatesSet = (arg: DatesSetArg) => {
    setTitle(arg.view.title);
    // FullCalendar's end is exclusive.
    const end = new Date(arg.end);
    end.setDate(end.getDate() - 1);
    setRange({ from: isoDate(arg.start), to: isoDate(end) });
  };

  const onDateClick = (arg: DateClickArg) => {
    if (!onPickSlot) return;
    const start = arg.date;
    const date = isoDate(start);
    // Month cells have no time: default to 10:00.
    const startTime = arg.allDay ? "10:00" : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    const [h, m] = startTime.split(":").map(Number);
    const endMin = h * 60 + m + 30;
    onPickSlot({ date, startTime, endTime: `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}` });
  };

  const { ref: fitRef, height: fitHeight } = useFillViewport();

  return (
    <div className="gd-calendar">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => api()?.today()}>
            Today
          </Button>
          <div className="flex">
            <button type="button" onClick={() => api()?.prev()} aria-label="Previous" className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => api()?.next()} aria-label="Next" className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <h2 className="font-display text-base font-bold sm:text-lg" aria-live="polite">
            {title}
          </h2>
          {isFetching && <span className="size-2 animate-pulse rounded-full bg-brand" aria-label="Loading" />}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {doctors.data && doctors.data.length > 0 && (
            <FilterMenu label="Doctor" value={doctor} onChange={setDoctor} options={doctors.data.map((d) => ({ value: String(d.id), label: d.name }))} />
          )}
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <Switch size="sm" checked={showInactive} onCheckedChange={setShowInactive} label="Show cancelled and rescheduled" />
            Cancelled &amp; moved
          </label>
          <div className="inline-flex rounded-xl bg-surface-muted p-1 text-xs font-medium" role="tablist" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => changeView(v.id)}
                className={cn("relative rounded-lg px-3 py-1.5 transition-colors", view === v.id ? "text-foreground" : "text-muted hover:text-foreground")}
              >
                {view === v.id && (
                  <motion.span layoutId="calendar-view" className="absolute inset-0 rounded-lg bg-surface shadow-card" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                )}
                <span className="relative">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={fitRef} style={{ height: fitHeight }} className="p-2 sm:p-3">
        <FullCalendar
          ref={ref}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="100%"
          firstDay={1}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          scrollTime="08:30:00"
          slotDuration="00:30:00"
          nowIndicator
          expandRows
          dayMaxEvents={3}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          events={events}
          datesSet={onDatesSet}
          dateClick={onPickSlot ? onDateClick : undefined}
          eventClick={(arg: EventClickArg) => onOpenBooking(Number(arg.event.id))}
          eventContent={renderEvent}
          noEventsContent="No consultations in this period."
        />
      </div>
    </div>
  );
}

function renderEvent(arg: EventContentArg) {
  const b = arg.event.extendedProps.booking as BookingListItem;
  const s = BOOKING_STATUS[b.status];
  const list = arg.view.type.startsWith("list");
  if (list) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{b.customer.name}</span>
        <span className="text-muted">{b.treatments.map((t) => t.name).join(" + ")}</span>
        {b.status !== "Booked" && <span style={{ color: s.color }} className="text-xs font-semibold">{s.label}</span>}
      </span>
    );
  }
  // Short consultations get one line for time + name, so the name is never cut off.
  const minutes = arg.event.end && arg.event.start ? (arg.event.end.getTime() - arg.event.start.getTime()) / 60000 : 60;
  const compact = arg.view.type.startsWith("timeGrid") && minutes <= 30;
  return (
    <div className={cn("flex h-full flex-col overflow-hidden px-1.5 py-1 text-[11px] leading-tight", s.muted && "opacity-70")}>
      {compact ? (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 font-semibold tabular-nums" style={{ color: s.color }}>
            {hhmm(b.startTime)}
          </span>
          <span className={cn("truncate font-semibold text-foreground", b.status === "Cancelled" && "line-through")}>{b.customer.name}</span>
        </span>
      ) : (
        <>
          <span className="font-semibold tabular-nums" style={{ color: s.color }}>
            {arg.timeText}
          </span>
          <span className={cn("truncate font-semibold text-foreground", b.status === "Cancelled" && "line-through")}>{b.customer.name}</span>
        </>
      )}
      <span className="truncate text-foreground/70">{b.treatments.map((t) => t.name).join(" + ")}</span>
    </div>
  );
}

/**
 * Sizes the calendar to exactly the space left below it in the window, so the page itself never
 * scrolls; only the calendar's time grid does. Falls back to a comfortable minimum on short screens.
 */
function useFillViewport(min = 340) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(min);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const main = el.closest("main");
      const bottomPadding = main ? parseFloat(getComputedStyle(main).paddingBottom) : 0;
      const top = el.getBoundingClientRect().top + window.scrollY;
      // 1px for the card's bottom border.
      setHeight(Math.max(min, Math.floor(window.innerHeight - top - bottomPadding - 1)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (el.parentElement) observer.observe(el.parentElement);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [min]);

  return { ref, height };
}
