import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * GrowDesk mark: a rising leaf-like shape inside a rounded square. Pure SVG so it stays crisp
 * and can be swapped for an uploaded logo from branding settings later.
 */
export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a shared id breaks when the first copy sits in a display:none subtree.
  const gradientId = `gd-logo-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c7cff" />
          <stop offset="55%" stopColor="#5b5bf6" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
      <path
        d="M12 27c0-7.5 5.5-13 15-14-0.6 9.4-6.1 15-14 15"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 28l8.5-8.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({ name, logoUrl, className }: { name: string; logoUrl?: string | null; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-configured URL, any host
        <img src={logoUrl} alt="" className="size-10 rounded-xl object-cover" />
      ) : (
        <LogoMark />
      )}
      <span className="font-display text-lg font-bold tracking-tight">{name}</span>
    </div>
  );
}
