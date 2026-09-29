import type { CaptureField } from '../types/capture';

export const ROOT_MENU_ID = 'crm-capture-root';

export const FIELD_MENU_IDS: Record<string, CaptureField> = {
  'crm-capture-set-name': 'name',
  'crm-capture-set-number': 'number',
  'crm-capture-set-insta': 'instagramName',
};

const ALL_MENU_IDS = [ROOT_MENU_ID, ...Object.keys(FIELD_MENU_IDS)];

const DOCUMENT_URL_PATTERNS = [
  'https://web.whatsapp.com/*',
  'https://www.instagram.com/*',
];

let buildPromise: Promise<void> | null = null;

const create = (props: chrome.contextMenus.CreateProperties): Promise<void> =>
  new Promise((resolve) => {
    chrome.contextMenus.create(props, () => {
      // Swallow "duplicate id" style errors so a worker restart is harmless.
      if (chrome.runtime.lastError) {
        console.warn('[CRM Capture] Context menu create:', chrome.runtime.lastError.message);
      }
      resolve();
    });
  });

/**
 * Rebuilds the menu tree from scratch. Menus start hidden; they are only
 * revealed while the active tab has a capture running.
 */
async function buildMenus(): Promise<void> {
  await new Promise<void>((resolve) => chrome.contextMenus.removeAll(() => resolve()));

  await create({
    id: ROOT_MENU_ID,
    title: 'CRM Capture',
    contexts: ['selection'],
    documentUrlPatterns: DOCUMENT_URL_PATTERNS,
    visible: false,
  });

  const titles: Record<CaptureField, string> = {
    name: 'Set as Name',
    number: 'Set as Number',
    instagramName: 'Set as Insta Name',
  };

  for (const [id, field] of Object.entries(FIELD_MENU_IDS)) {
    await create({
      id,
      parentId: ROOT_MENU_ID,
      title: titles[field],
      contexts: ['selection'],
      documentUrlPatterns: DOCUMENT_URL_PATTERNS,
      visible: false,
    });
  }
}

/** Builds the menus once per service-worker lifetime. */
export function ensureMenus(forceRebuild = false): Promise<void> {
  if (forceRebuild || !buildPromise) {
    buildPromise = buildMenus().catch((error) => {
      console.error('[CRM Capture] Failed to build context menus.', error);
      buildPromise = null;
    });
  }
  return buildPromise;
}

/** Shows or hides the whole "CRM Capture" submenu. */
export async function setMenusVisible(visible: boolean): Promise<void> {
  await ensureMenus();
  for (const id of ALL_MENU_IDS) {
    try {
      await chrome.contextMenus.update(id, { visible });
    } catch (error) {
      console.warn(`[CRM Capture] Could not update menu "${id}".`, error);
    }
  }
}
