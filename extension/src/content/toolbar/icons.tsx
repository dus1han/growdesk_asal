import { useId } from 'react';

/** The GrowDesk mark (same drawing as the CRM's LogoMark). */
export function LogoMark() {
  const id = `gd-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c7cff" />
          <stop offset="55%" stopColor="#5b5bf6" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <path d="M12 27c0-7.5 5.5-13 15-14-0.6 9.4-6.1 15-14 15" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 28l8.5-8.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

const icon = (d: string, strokeWidth = 2) =>
  function Icon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    );
  };

export const CheckIcon = icon('M20 6 9 17l-5-5', 3.2);
export const CaretIcon = icon('m6 9 6 6 6-6', 2.2);
export const CloseIcon = icon('M18 6 6 18M6 6l12 12', 2.2);
export const PlayIcon = icon('M7 5v14l11-7z', 2.2);
export const SendIcon = icon('M5 12h14M13 6l6 6-6 6', 2.4);
export const HelpIcon = icon('M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 2);
