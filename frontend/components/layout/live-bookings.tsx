"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, CalendarClock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookingDetailsDrawer } from "@/components/bookings/booking-details-drawer";
import { formatTime } from "@/components/bookings/booking-status";
import { playChime, showDesktopAlert, unlockSound } from "@/lib/live-alerts";
import { cn } from "@/lib/utils";

/** A booking the WhatsApp BOT just made, moved or cancelled (backend LiveBookingEventDto). */
interface LiveBookingEvent {
  type: "booking.created" | "booking.rescheduled" | "booking.cancelled" | "booking.updated";
  bookingId: number;
  customerId: number;
  customerName: string;
  newCustomer: boolean;
  date: string;
  startTime: string;
  endTime: string;
  treatments: string[];
  source: string;
  createdAt: string;
}

const EVENT_TYPES = ["booking.created", "booking.rescheduled", "booking.cancelled", "booking.updated"] as const;
const SHOW_MS = 10_000;
const MAX_CARDS = 3;
/** After the server refuses or drops the stream for good (e.g. a deploy), try again after this. */
const RECONNECT_MS = 15_000;

/**
 * Live bookings from the WhatsApp BOT. One Server-Sent Events connection per tab: the server
 * pushes each booking the moment it is made, a card slides in at the bottom right, and the
 * calendar, lists and dashboard refresh. A dropped connection reconnects and catches up on
 * anything missed (the browser sends the last event ID it saw).
 */
export function LiveBookings() {
  const qc = useQueryClient();
  const [cards, setCards] = useState<LiveBookingEvent[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const visible = usePageVisible();
  const [unseen, setUnseen] = useState(0);

  // While GrowDesk is in a background tab, the tab title counts what arrived: "(2) New booking – …".
  useEffect(() => {
    const strip = (t: string) => t.replace(TITLE_PREFIX, "");
    if (visible) {
      setUnseen(0); // eslint-disable-line react-hooks/set-state-in-effect -- seen once the tab is shown
      document.title = strip(document.title);
    } else if (unseen > 0) {
      document.title = `(${unseen}) New booking – ${strip(document.title)}`;
    }
  }, [visible, unseen]);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let lastId: string | null = null;
    let stopped = false;

    const onEvent = (e: MessageEvent<string>) => {
      if (e.lastEventId) lastId = e.lastEventId;
      let evt: LiveBookingEvent;
      try {
        evt = JSON.parse(e.data) as LiveBookingEvent;
      } catch {
        return;
      }
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (evt.type !== "booking.updated") {
        setCards((c) => [evt, ...c.filter((x) => x.bookingId !== evt.bookingId)].slice(0, MAX_CARDS));
        if (document.visibilityState !== "visible") setUnseen((n) => n + 1);
        playChime();
        const what = evt.type === "booking.cancelled" ? "Booking cancelled" : evt.type === "booking.rescheduled" ? "Booking moved" : "New booking";
        showDesktopAlert(`${what} · ${evt.source}`, `${evt.customerName} · ${evt.date} ${evt.startTime.slice(0, 5)}`, () =>
          setOpenId(evt.bookingId),
        );
      }
    };

    const connect = () => {
      // The browser resends the last event ID on its own reconnects; a fresh EventSource needs it in the URL.
      source = new EventSource(lastId ? `/api/live/stream?lastEventId=${encodeURIComponent(lastId)}` : "/api/live/stream");
      for (const type of EVENT_TYPES) source.addEventListener(type, onEvent as EventListener);
      // Sent on connect: the latest booking ID, so a reconnect catches up on what it missed.
      source.addEventListener("ready", ((e: MessageEvent<string>) => {
        if (e.lastEventId) lastId = e.lastEventId;
      }) as EventListener);
      source.onerror = () => {
        // Still CONNECTING means the browser is retrying by itself; CLOSED means it gave up.
        if (stopped || source?.readyState !== EventSource.CLOSED) return;
        retry = setTimeout(connect, RECONNECT_MS);
      };
    };

    connect();
    // Sound can only play after a click in the page; prepare it on the first one.
    window.addEventListener("pointerdown", unlockSound, { once: true });
    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
      window.removeEventListener("pointerdown", unlockSound);
    };
  }, [qc]);

  const dismiss = useCallback((bookingId: number) => setCards((c) => c.filter((x) => x.bookingId !== bookingId)), []);

  return (
    <>
      <div
        className="pointer-events-none fixed bottom-24 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col-reverse gap-3 lg:bottom-6 lg:right-6"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {cards.map((card) => (
            <LiveBookingCard
              key={card.bookingId}
              booking={card}
              onClose={() => dismiss(card.bookingId)}
              onOpen={() => {
                setOpenId(card.bookingId);
                dismiss(card.bookingId);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
      <BookingDetailsDrawer bookingId={openId} onClose={() => setOpenId(null)} onBookingChange={setOpenId} />
    </>
  );
}

/** "Fri, 9 Oct": the year only when it isn't this year. */
function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(y !== new Date().getFullYear() && { year: "numeric" }),
  });
}

const TITLE_PREFIX = /^\(\d+\) New booking – /;

/** True while this browser tab is the one being shown. */
function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "•";

function LiveBookingCard({ booking, onClose, onOpen }: { booking: LiveBookingEvent; onClose: () => void; onOpen: () => void }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const visible = usePageVisible();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  // Slides away by itself once it has been on screen for a while: never while GrowDesk is in a
  // background tab (it waits until someone looks), and not while hovered.
  useEffect(() => {
    if (hovered || !visible) return;
    const t = setTimeout(() => close.current(), SHOW_MS);
    return () => clearTimeout(t);
  }, [hovered, visible]);

  const moved = booking.type === "booking.rescheduled";
  const cancelled = booking.type === "booking.cancelled";
  const badge = cancelled ? "Cancelled" : moved ? "Moved" : booking.newCustomer ? "New customer" : "Booked";

  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 380, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 380, transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      role="status"
      className="pointer-events-auto overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_48px_-16px_rgb(15_23_42/0.28)]"
    >
      <div className="h-1 bg-gradient-to-r from-brand via-violet-500 to-emerald-400" aria-hidden />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-brand">
            <Bot className="size-3.5" />
            {cancelled ? "Booking cancelled" : moved ? "Booking moved" : "New booking"} · {booking.source}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
            {initials(booking.customerName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold">{booking.customerName}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  cancelled ? "bg-red-50 text-red-700" : moved ? "bg-amber-50 text-amber-700" : booking.newCustomer ? "bg-emerald-50 text-emerald-700" : "bg-brand-soft text-brand-strong",
                )}
              >
                {badge}
              </span>
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <CalendarClock className="size-3.5 shrink-0" />
              <span className={cn("truncate", cancelled && "line-through")}>
                {shortDate(booking.date)} · {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
              </span>
            </span>
          </span>
        </div>

        {booking.treatments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {booking.treatments.map((t) => (
              <span key={t} className="rounded-full border border-line bg-surface-muted/60 px-2 py-0.5 text-[11.5px] font-medium">
                {t}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onOpen}
          className="group mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          View booking
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}
