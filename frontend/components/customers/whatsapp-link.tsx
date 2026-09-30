import { cn } from "@/lib/utils";

/** "+971 50 123 4567" → https://wa.me/971501234567, which opens a chat in WhatsApp Web or the app. */
export const whatsAppUrl = (number: string) => `https://wa.me/${number.replace(/\D/g, "")}`;

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.23 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06a6.76 6.76 0 0 1-3.37-2.95c-.25-.44.25-.41.72-1.36.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74 1.58.68 2.2.74 2.99.62.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.17-.47-.29Z" />
    </svg>
  );
}

/**
 * A WhatsApp number that opens a chat when clicked. Clicks don't reach the row or card around
 * it, so opening WhatsApp never also opens the customer.
 */
export function WhatsAppLink({ number, className }: { number: string; className?: string }) {
  return (
    <a
      href={whatsAppUrl(number)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Chat on WhatsApp with ${number}`}
      aria-label={`Chat on WhatsApp with ${number}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        "group/wa inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 -mx-1.5 tabular-nums transition-colors hover:bg-[#25d366]/10 hover:text-[#128c7e] focus-visible:bg-[#25d366]/10",
        className,
      )}
    >
      <WhatsAppGlyph className="size-4 shrink-0 text-[#25d366] transition-transform duration-150 group-hover/wa:scale-110" />
      <span className="underline-offset-2 group-hover/wa:underline">{number}</span>
    </a>
  );
}
