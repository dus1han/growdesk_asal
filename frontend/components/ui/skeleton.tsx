import { cn } from "@/lib/utils";

/** Shimmering placeholder. Used instead of "Loading..." text everywhere. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--surface-muted)_0%,#e9ecf5_40%,var(--surface-muted)_80%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
