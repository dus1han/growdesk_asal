/** Local calendar dates as yyyy-MM-dd, the format the API uses for date-only values. */
export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export const today = () => isoDate(new Date());

/** "12 Oct 2026" from a yyyy-MM-dd string, without timezone drift. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Follow-up state relative to today, for colouring. */
export function followUpState(iso: string | null | undefined): "overdue" | "today" | "upcoming" | null {
  if (!iso) return null;
  const t = today();
  return iso < t ? "overdue" : iso === t ? "today" : "upcoming";
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface DatePreset {
  label: string;
  range: () => DateRange;
}

/** "Created" filter presets. Values are local calendar dates. */
export const CREATED_PRESETS: Record<string, DatePreset> = {
  today: { label: "Today", range: () => ({ from: today(), to: today() }) },
  "7d": { label: "Last 7 days", range: () => ({ from: isoDate(addDays(new Date(), -6)), to: today() }) },
  "30d": { label: "Last 30 days", range: () => ({ from: isoDate(addDays(new Date(), -29)), to: today() }) },
  month: {
    label: "This month",
    range: () => {
      const n = new Date();
      return { from: isoDate(new Date(n.getFullYear(), n.getMonth(), 1)), to: today() };
    },
  },
};

/** "Follow-up" filter presets. */
export const FOLLOW_UP_PRESETS: Record<string, DatePreset> = {
  overdue: { label: "Overdue", range: () => ({ to: isoDate(addDays(new Date(), -1)) }) },
  today: { label: "Due today", range: () => ({ from: today(), to: today() }) },
  week: { label: "Next 7 days", range: () => ({ from: today(), to: isoDate(addDays(new Date(), 6)) }) },
};
