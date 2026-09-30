/**
 * The GrowDesk connection, set in the options page. The client secret is a write credential,
 * so it lives only in this browser profile's extension storage, never in the build.
 */
export interface Settings {
  /** GrowDesk address, e.g. https://crm.example.com or http://169.58.92.105:3110 */
  serverUrl: string;
  clientId: string;
  clientSecret: string;
}

const KEY = 'growdesk-capture-settings';

export const DEFAULT_SETTINGS: Settings = { serverUrl: '', clientId: '', clientSecret: '' };

export async function readSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.local.get(KEY);
    return { ...DEFAULT_SETTINGS, ...((stored[KEY] as Partial<Settings>) ?? {}) };
  } catch (error) {
    console.error('[GrowDesk Capture] Failed to read settings.', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(settings: Settings): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [KEY]: settings });
    return true;
  } catch (error) {
    console.error('[GrowDesk Capture] Failed to save settings.', error);
    return false;
  }
}

/**
 * "169.58.92.105:3110" or "https://crm.example.com/" → origin, or null when unusable. Without a
 * scheme, an IP address or localhost means http; a name means https.
 */
export function normalizeServer(input: string): string | null {
  let text = input.trim();
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) && !/^https?:\/\//i.test(text)) return null;
  if (!/^https?:\/\//i.test(text)) {
    const host = text.split(/[/:]/)[0];
    text = (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' ? 'http://' : 'https://') + text;
  }
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const isConfigured = (s: Settings): boolean =>
  normalizeServer(s.serverUrl) !== null && s.clientId.trim() !== '' && s.clientSecret.trim() !== '';

/** GrowDesk's animated guide to using the toolbar, or null until a server is set. */
export const guideUrl = (s: Settings): string | null => {
  const server = normalizeServer(s.serverUrl);
  return server ? `${server}/capture-guide` : null;
};

/** The host-permission pattern Chrome must grant before the service worker can reach GrowDesk. */
export const originPattern = (server: string): string => `${server}/*`;
