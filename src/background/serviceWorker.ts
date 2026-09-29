import { createSession, type CaptureSession, type Platform } from '../types/capture';
import type {
  ContentMessage,
  SaveResponse,
  StatePushMessage,
  StateResponse,
} from '../types/messages';
import {
  clearSession,
  isTabCapturing,
  readSession,
  writeSession,
} from '../storage/captureSession';
import { ensureMenus, FIELD_MENU_IDS, setMenusVisible } from './contextMenus';
import { FIELD_LABEL, normalizeSelection } from '../utils/normalize';
import { platformFromUrl } from '../utils/platform';
import { isConfigured, readSettings } from '../storage/settings';
import { buildLead } from '../types/lead';
import { pushToDestination } from '../utils/push';
import { buildFilename, buildTxt } from '../utils/txtExporter';
import { canSave } from '../types/capture';

/** Pushes state (and an optional flash message) down to one tab's toolbar. */
async function pushState(
  tabId: number,
  session: CaptureSession | null,
  flash?: string,
  flashTone: StatePushMessage['flashTone'] = 'success',
): Promise<void> {
  const message: StatePushMessage = { type: 'CRM_STATE', session, flash, flashTone };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // The content script may not be injected yet (or the tab is gone).
    // It re-requests state on mount, so dropping this push is safe.
  }
}

/** Keeps global menu visibility in step with the currently focused tab. */
async function syncMenusForActiveTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const capturing = tab?.id != null && (await isTabCapturing(tab.id));
    await setMenusVisible(Boolean(capturing));
  } catch (error) {
    console.error('[CRM Capture] Failed to sync context menus.', error);
    await setMenusVisible(false);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureMenus(true).then(syncMenusForActiveTab);
});

chrome.runtime.onStartup.addListener(() => {
  void ensureMenus(true).then(syncMenusForActiveTab);
});

chrome.tabs.onActivated.addListener(() => {
  void syncMenusForActiveTab();
});

chrome.windows.onFocusChanged.addListener(() => {
  void syncMenusForActiveTab();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void clearSession(tabId);
});

// The toolbar icon has no popup, so a click opens the settings page.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

/** Handles a right-click on "Set as Name / Number / Insta Name". */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const field = FIELD_MENU_IDS[String(info.menuItemId)];
  const tabId = tab?.id;
  if (!field || tabId == null) return;

  void (async () => {
    const session = await readSession(tabId);
    if (!session?.active) {
      // Menus are global; re-sync rather than blanket-hide so a capture
      // running in another window is not affected.
      await syncMenusForActiveTab();
      await pushState(tabId, session, 'Capture is not active. Press START first.', 'error');
      return;
    }

    const value = normalizeSelection(field, info.selectionText ?? '');
    if (!value) {
      await pushState(tabId, session, 'No text selected. Highlight text first.', 'error');
      return;
    }

    const updated: CaptureSession = { ...session, [field]: value };
    const stored = await writeSession(tabId, updated);
    if (!stored) {
      await pushState(tabId, session, 'Could not save capture. See console.', 'error');
      return;
    }

    await pushState(tabId, updated, `${FIELD_LABEL[field]} captured: ${value}`, 'success');
  })();
});

/** Request/response channel used by the toolbar. */
chrome.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (tabId == null) {
    sendResponse({ ok: false, session: null, error: 'No tab context.' } satisfies StateResponse);
    return false;
  }

  void (async () => {
    try {
      switch (message.type) {
        case 'CRM_GET_STATE': {
          const session = await readSession(tabId);
          if (session?.active) {
            // A tab can be navigated between the two supported sites mid-capture.
            const platform = resolvePlatform(message.platform, sender.url);
            if (platform && session.source !== platform) {
              session.source = platform;
              await writeSession(tabId, session);
            }
          }
          await syncMenusForActiveTab();
          sendResponse({ ok: true, session } satisfies StateResponse);
          return;
        }

        case 'CRM_START': {
          const platform = resolvePlatform(message.platform, sender.url);
          if (!platform) {
            sendResponse({
              ok: false,
              session: null,
              error: 'Unsupported page.',
            } satisfies StateResponse);
            return;
          }
          const session = createSession(platform);
          const stored = await writeSession(tabId, session);
          if (!stored) {
            sendResponse({
              ok: false,
              session: null,
              error: 'Storage unavailable.',
            } satisfies StateResponse);
            return;
          }
          await setMenusVisible(true);
          sendResponse({ ok: true, session } satisfies StateResponse);
          return;
        }

        case 'CRM_SAVE': {
          sendResponse(await saveLead(tabId));
          return;
        }

        case 'CRM_FINISH': {
          await clearSession(tabId);
          await syncMenusForActiveTab();
          sendResponse({ ok: true, session: null } satisfies StateResponse);
          return;
        }

        default: {
          sendResponse({
            ok: false,
            session: null,
            error: 'Unknown message.',
          } satisfies StateResponse);
        }
      }
    } catch (error) {
      console.error('[CRM Capture] Service worker message failed.', error);
      sendResponse({
        ok: false,
        session: null,
        error: error instanceof Error ? error.message : 'Unexpected error.',
      } satisfies StateResponse);
    }
  })();

  // Keep the message channel open for the async response above.
  return true;
});

/**
 * Sends the tab's capture to the configured destination and, only on success,
 * ends the session. A failed push keeps everything so the user can press STOP
 * again - with no local copy by default, saving must never silently discard a
 * lead.
 */
async function saveLead(tabId: number): Promise<SaveResponse> {
  const session = await readSession(tabId);
  if (!session || !canSave(session)) {
    return { ok: false, error: 'Capture a Number or Insta Name before saving.' };
  }

  const settings = await readSettings();
  if (!isConfigured(settings)) {
    return {
      ok: false,
      error: 'No CRM endpoint configured. Open the extension options to set it up.',
    };
  }

  const capturedAt = new Date();
  const lead = buildLead(session, capturedAt, settings.deviceLabel);
  const result = await pushToDestination(settings, { lead });

  // The optional TXT is a belt-and-braces copy, produced either way so a
  // failed push never leaves the user with nothing.
  const txt = settings.alsoSaveTxt
    ? { filename: buildFilename(capturedAt), contents: buildTxt(session, capturedAt) }
    : undefined;

  if (!result.ok) return { ok: false, error: result.error, txt };

  await clearSession(tabId);
  await syncMenusForActiveTab();
  return { ok: true, txt };
}

function resolvePlatform(claimed: Platform | undefined, senderUrl?: string): Platform | null {
  // Trust the sender URL Chrome reports over anything the page sent us.
  return platformFromUrl(senderUrl) ?? claimed ?? null;
}
