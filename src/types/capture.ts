/** Platforms this prototype supports. */
export type Platform = 'WhatsApp' | 'Instagram';

/** Which field a context-menu click targets. */
export type CaptureField = 'name' | 'number' | 'instagramName';

/**
 * A single in-progress lead capture, scoped to one browser tab.
 * Held in chrome.storage.session so it survives service-worker sleep
 * and page reloads, but never outlives the browser session.
 */
export interface CaptureSession {
  active: boolean;
  name?: string;
  number?: string;
  instagramName?: string;
  source: Platform;
  /** ISO timestamp of when START was pressed. */
  startedAt?: string;
}

/** Creates an empty, active session for the given platform. */
export function createSession(source: Platform): CaptureSession {
  return {
    active: true,
    source,
    startedAt: new Date().toISOString(),
  };
}

/**
 * The prototype's identity rule: a lead can only be saved when it carries
 * at least one contact identifier. Name alone is never enough.
 */
export function canSave(session: CaptureSession | null | undefined): boolean {
  if (!session || !session.active) return false;
  return Boolean(session.number?.trim()) || Boolean(session.instagramName?.trim());
}
