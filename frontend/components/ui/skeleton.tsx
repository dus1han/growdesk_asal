import { cn } from "@/lib/utils";

/** Shimmering placeholder. Used instead of "Loading..." text everywhere. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--surface-muted)_0%,#e9ecf5_40%,var(--surface-muted)_80%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
