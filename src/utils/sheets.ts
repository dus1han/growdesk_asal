import type { CaptureSession } from '../types/capture';
import type { Settings } from '../storage/settings';
import { formatTimestamp } from './txtExporter';

/** One lead as it is sent to the Apps Script Web App. */
export interface LeadRow {
  /** ISO 8601 with offset - the sortable, unambiguous value written to the sheet. */
  capturedAtIso: string;
  /** Human-readable local time, kept for reference. */
  capturedAtLocal: string;
  name: string;
  number: string;
  instagramName: string;
  source: string;
  device: string;
}

export interface PushResult {
  ok: boolean;
  error?: string;
}

/** ISO 8601 including the local UTC offset, e.g. 2026-09-29T13:52:56+04:00. */
export function toIsoWithOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offset =
    offsetMinutes === 0 ? 'Z' : `${sign}${pad(offsetMinutes / 60)}:${pad(offsetMinutes % 60)}`;
  return `${formatTimestamp(date).replace(' ', 'T')}${offset}`;
}

export function buildLeadRow(
  session: CaptureSession,
  capturedAt: Date,
  device: string,
): LeadRow {
  return {
    capturedAtIso: toIsoWithOffset(capturedAt),
    capturedAtLocal: formatTimestamp(capturedAt),
    name: session.name?.trim() ?? '',
    number: session.number?.trim() ?? '',
    instagramName: session.instagramName?.trim() ?? '',
    source: session.source,
    device: device.trim(),
  };
}

const TIMEOUT_MS = 20_000;

/**
 * POSTs one lead to the Apps Script Web App.
 *
 * Must run in the service worker: extensions bypass CORS only for hosts in
 * host_permissions, and a content script would be blocked by the page's own
 * CORS rules. text/plain avoids a preflight; Apps Script reads the raw body.
 */
export async function pushLead(
  settings: Settings,
  payload: { lead?: LeadRow; test?: boolean },
): Promise<PushResult> {
  const url = settings.webAppUrl.trim();
  if (!url) return { ok: false, error: 'No Google Sheet URL configured. Open extension options.' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: settings.sharedSecret, ...payload }),
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, error: `Sheet rejected the request (HTTP ${response.status}).` };
    }

    const text = await response.text();
    let parsed: { ok?: boolean; error?: string };
    try {
      parsed = JSON.parse(text) as { ok?: boolean; error?: string };
    } catch {
      // A Google sign-in page instead of JSON means the Web App is not public.
      return {
        ok: false,
        error: 'Unexpected reply from the Web App. Check it is deployed with access "Anyone".',
      };
    }

    if (!parsed.ok) return { ok: false, error: parsed.error ?? 'The sheet script reported a failure.' };
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'Timed out reaching the Google Sheet.'
        : `Could not reach the Google Sheet: ${error instanceof Error ? error.message : 'unknown error'}`;
    console.error('[CRM Capture] Sheet push failed.', error);
    return { ok: false, error: message };
  }
}
