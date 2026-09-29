/**
 * User settings for the Google Sheet push. Kept in chrome.storage.local so the
 * endpoint is configured at runtime rather than baked into the build - the
 * Web App URL is effectively a write credential and must not live in source.
 */
export interface Settings {
  /** Apps Script Web App /exec URL. */
  webAppUrl: string;
  /** Shared secret checked by the Apps Script before it appends a row. */
  sharedSecret: string;
  /** Optional label identifying which PC a lead came from. */
  deviceLabel: string;
  /** Also download the TXT file on STOP. Off by default: sheet-only. */
  alsoSaveTxt: boolean;
}

const KEY = 'crm-capture-settings';

export const DEFAULT_SETTINGS: Settings = {
  webAppUrl: '',
  sharedSecret: '',
  deviceLabel: '',
  alsoSaveTxt: false,
};

export async function readSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.local.get(KEY);
    return { ...DEFAULT_SETTINGS, ...((stored[KEY] as Partial<Settings>) ?? {}) };
  } catch (error) {
    console.error('[CRM Capture] Failed to read settings.', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(settings: Settings): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [KEY]: settings });
    return true;
  } catch (error) {
    console.error('[CRM Capture] Failed to save settings.', error);
    return false;
  }
}

/** True when enough is configured to attempt a push. */
export function isConfigured(settings: Settings): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(settings.webAppUrl.trim());
}
