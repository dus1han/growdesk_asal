import type { CaptureSession } from '../types/capture';

const KEY_PREFIX = 'crm-capture-session-';

const keyFor = (tabId: number): string => `${KEY_PREFIX}${tabId}`;

/**
 * Session storage is only reachable from trusted contexts (the service
 * worker), so the content script always goes through message passing.
 * Every helper degrades gracefully instead of throwing into a listener.
 */
export async function readSession(tabId: number): Promise<CaptureSession | null> {
  try {
    const key = keyFor(tabId);
    const stored = await chrome.storage.session.get(key);
    return (stored[key] as CaptureSession | undefined) ?? null;
  } catch (error) {
    console.error('[CRM Capture] Failed to read session from storage.', error);
    return null;
  }
}

export async function writeSession(tabId: number, session: CaptureSession): Promise<boolean> {
  try {
    await chrome.storage.session.set({ [keyFor(tabId)]: session });
    return true;
  } catch (error) {
    console.error('[CRM Capture] Failed to write session to storage.', error);
    return false;
  }
}

export async function clearSession(tabId: number): Promise<void> {
  try {
    await chrome.storage.session.remove(keyFor(tabId));
  } catch (error) {
    console.error('[CRM Capture] Failed to clear session from storage.', error);
  }
}

/** True when the given tab currently has an active capture running. */
export async function isTabCapturing(tabId: number): Promise<boolean> {
  const session = await readSession(tabId);
  return Boolean(session?.active);
}
