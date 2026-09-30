import { cn } from "@/lib/utils";

/** Stage colours always come from the stage itself (admin-configured), never from component code. */
export function StageBadge({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", className)}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function TreatmentChips({ treatments, max = 3 }: { treatments: { id: number; name: string }[]; max?: number }) {
  if (treatments.length === 0) return <span className="text-xs text-muted">—</span>;
  const shown = treatments.slice(0, max);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <span key={t.id} className="whitespace-nowrap rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
          {t.name}
        </span>
      ))}
      {treatments.length > max && (
        <span className="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted" title={treatments.slice(max).map((t) => t.name).join(", ")}>
          +{treatments.length - max}
        </span>
      )}
    </span>
  );
}
