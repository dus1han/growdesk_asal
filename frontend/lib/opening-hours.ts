import type { BookingHours } from "@/types/admin";

/** Index = JavaScript's getDay() (0 = Sunday). */
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Opening and closing time ("HH:mm") on a date (yyyy-MM-dd), or null when closed. */
export function openOn(hours: BookingHours | undefined, date: string): { from: string; to: string } | null {
  if (!hours || !date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const name = DAY_NAMES[new Date(y, m - 1, d).getDay()];
  const day = hours.days.find((x) => x.day === name);
  return day?.isOpen && day.from && day.to ? { from: day.from, to: day.to } : null;
}

/** FullCalendar businessHours: time outside them is shaded. */
export function businessHours(hours: BookingHours | undefined) {
  if (!hours) return false;
  return hours.days
    .filter((d) => d.isOpen && d.from && d.to)
    .map((d) => ({ daysOfWeek: [DAY_NAMES.indexOf(d.day)], startTime: d.from!, endTime: d.to! }));
}
