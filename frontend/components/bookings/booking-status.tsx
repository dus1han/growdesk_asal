import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/bookings";

/**
 * One definition of how each booking status looks, shared by badges, the calendar and lists.
 * Colours are fixed per status (unlike stages, which are admin-configured).
 */
export const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string; badge: string; muted?: boolean }> = {
  Booked: { label: "Booked", color: "#5b5bf6", badge: "bg-brand-soft text-brand-strong" },
  Completed: { label: "Completed", color: "#16a34a", badge: "bg-emerald-50 text-emerald-700" },
  Rescheduled: { label: "Rescheduled", color: "#d97706", badge: "bg-amber-50 text-amber-700", muted: true },
  Cancelled: { label: "Cancelled", color: "#94a3b8", badge: "bg-slate-100 text-slate-600", muted: true },
  NoShow: { label: "No-show", color: "#dc2626", badge: "bg-red-50 text-red-700", muted: true },
};

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const s = BOOKING_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", s.badge, className)}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}

/** "16:00:00" → "4:00 PM" in the user's locale. */
export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export const hhmm = (t: string) => t.slice(0, 5);

export function formatMoney(amount: number | null | undefined, currency = "AED") {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}
