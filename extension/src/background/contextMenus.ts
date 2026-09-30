import { enabledFields, fieldKind } from '../types/capture';
import type { ConfigBundle } from '../types/growdesk';

/**
 * The right-click menu: "GrowDesk Capture → Set as <field>" for every field the admin enabled
 * that is filled by highlighting text. It is rebuilt whenever the field setup changes and only
 * shown while the focused tab has a capture running.
 */

export const ROOT_MENU_ID = 'growdesk-capture-root';
const FIELD_PREFIX = 'growdesk-set:';

const DOCUMENT_URL_PATTERNS = ['https://web.whatsapp.com/*', 'https://www.instagram.com/*'];

/**
 * Selected text, or anything right-clicked without a selection: WhatsApp doesn't let some text be
 * selected (the name and number in Contact info), so right-clicking it must work too.
 */
const CONTEXTS: [chrome.contextMenus.ContextType, ...chrome.contextMenus.ContextType[]] = ['selection', 'page', 'link', 'image'];

/** The field key a menu item sets, or null for other items. */
export const fieldKeyFromMenuId = (id: string | number): string | null =>
  String(id).startsWith(FIELD_PREFIX) ? String(id).slice(FIELD_PREFIX.length) : null;

let menuIds: string[] = [];
let visible = false;
let buildChain: Promise<void> = Promise.resolve();

const create = (props: chrome.contextMenus.CreateProperties): Promise<void> =>
  new Promise((resolve) => {
    chrome.contextMenus.create(props, () => {
      // Swallow "duplicate id" style errors so a worker restart is harmless.
      if (chrome.runtime.lastError) console.warn('[GrowDesk Capture] Context menu:', chrome.runtime.lastError.message);
      resolve();
    });
  });

async function build(bundle: ConfigBundle | null): Promise<void> {
  await new Promise<void>((resolve) => chrome.contextMenus.removeAll(() => resolve()));
  menuIds = [];

  await create({ id: ROOT_MENU_ID, title: 'GrowDesk Capture', contexts: CONTEXTS, documentUrlPatterns: DOCUMENT_URL_PATTERNS, visible });
  menuIds.push(ROOT_MENU_ID);

  for (const field of enabledFields(bundle).filter((f) => fieldKind(f) === 'highlight')) {
    const id = FIELD_PREFIX + field.key;
    await create({
      id,
      parentId: ROOT_MENU_ID,
      title: field.type === 'textarea' ? `Add to ${field.label}` : `Set as ${field.label}`,
      contexts: CONTEXTS,
      documentUrlPatterns: DOCUMENT_URL_PATTERNS,
      visible,
    });
    menuIds.push(id);
  }
}

/** Rebuilds the menu for a field setup. Calls are queued so two rebuilds never interleave. */
export function rebuildMenus(bundle: ConfigBundle | null): Promise<void> {
  buildChain = buildChain.then(() => build(bundle)).catch((error) => console.error('[GrowDesk Capture] Menu build failed.', error));
  return buildChain;
}

/** Shows or hides the whole "GrowDesk Capture" submenu. */
export async function setMenusVisible(show: boolean): Promise<void> {
  visible = show;
  await buildChain;
  for (const id of menuIds) {
    try {
      await chrome.contextMenus.update(id, { visible: show });
    } catch (error) {
      console.warn(`[GrowDesk Capture] Could not update menu "${id}".`, error);
    }
  }
}
