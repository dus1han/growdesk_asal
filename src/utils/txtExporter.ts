import type { CaptureSession } from '../types/capture';

const NOT_CAPTURED = 'Not captured';

const pad = (value: number): string => String(value).padStart(2, '0');

/** Formats a date as `YYYY-MM-DD HH:mm:ss` in the user's local time. */
export function formatTimestamp(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Builds the `lead-YYYY-MM-DD-HH-mm-ss.txt` filename. */
export function buildFilename(date: Date): string {
  return `lead-${formatTimestamp(date).replace(' ', '-').replace(/:/g, '-')}.txt`;
}

/** Renders the plain-text lead record. Missing fields read "Not captured". */
export function buildTxt(session: CaptureSession, capturedAt: Date): string {
  const lines = [
    `Name: ${session.name?.trim() || NOT_CAPTURED}`,
    `Number: ${session.number?.trim() || NOT_CAPTURED}`,
    `Instagram Name: ${session.instagramName?.trim() || NOT_CAPTURED}`,
    `Source: ${session.source}`,
    `Captured At: ${formatTimestamp(capturedAt)}`,
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * Downloads text as a file from the page context using an object URL, so the
 * extension never needs the `downloads` permission. Falls back to a data URL
 * if object URLs are unavailable.
 */
export function downloadTxt(filename: string, contents: string): void {
  let objectUrl: string | null = null;
  let href: string;

  try {
    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    objectUrl = URL.createObjectURL(blob);
    href = objectUrl;
  } catch (error) {
    console.warn('[CRM Capture] Object URL unavailable, falling back to data URL.', error);
    href = `data:text/plain;charset=utf-8,${encodeURIComponent(contents)}`;
  }

  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  const parent = document.body ?? document.documentElement;
  parent.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    if (objectUrl) {
      // Give Chrome a moment to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(objectUrl as string), 2000);
    }
  }
}
