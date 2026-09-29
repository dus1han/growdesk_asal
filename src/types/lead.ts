import type { CaptureSession } from './capture';
import { formatTimestamp } from '../utils/txtExporter';

/** One captured lead, in a form no particular CRM knows about. */
export interface Lead {
  /** ISO 8601 with UTC offset - sortable and unambiguous across machines. */
  capturedAtIso: string;
  /** Human-readable local time, for systems that want a display string. */
  capturedAtLocal: string;
  name: string;
  number: string;
  instagramName: string;
  source: string;
  device: string;
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

export function buildLead(session: CaptureSession, capturedAt: Date, device: string): Lead {
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
