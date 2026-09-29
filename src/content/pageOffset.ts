import type { Platform } from '../types/capture';

export const TOOLBAR_HEIGHT = 48;

const STYLE_ID = 'crm-capture-offset-style';
export const OFFSET_CLASS = 'crm-capture-offset';

const PLATFORM_CLASS: Record<Platform, string> = {
  WhatsApp: 'crm-platform-whatsapp',
  Instagram: 'crm-platform-instagram',
};

const ALL_PLATFORM_CLASSES = Object.values(PLATFORM_CLASS);

/**
 * Pushes the host page down by the toolbar height instead of overlaying it.
 *
 * A plain `margin-top` on <html> is not enough. WhatsApp's `#app` is
 * `position: absolute` with no positioned ancestor, so it resolves against the
 * initial containing block — the viewport — and slides straight back under the
 * toolbar at `top: 0`. Making <html> `position: relative` turns it into that
 * containing block, and clamping the app's `100vh` height stops it overflowing
 * off the bottom of the screen by the same 48px.
 *
 * Instagram scrolls in normal document flow, so it only needs the offset; a
 * height clamp there would break page scrolling. Rules are therefore scoped
 * per platform.
 */
export function applyPageOffset(platform: Platform): void {
  const root = document.documentElement;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html.${OFFSET_CLASS} {
        margin-top: ${TOOLBAR_HEIGHT}px !important;
        position: relative !important;
      }

      /* WhatsApp: fixed-height app shell that must fit the remaining space. */
      html.${OFFSET_CLASS}.${PLATFORM_CLASS.WhatsApp} {
        height: calc(100% - ${TOOLBAR_HEIGHT}px) !important;
      }
      html.${OFFSET_CLASS}.${PLATFORM_CLASS.WhatsApp} > body {
        height: 100% !important;
        min-height: 0 !important;
      }
      html.${OFFSET_CLASS}.${PLATFORM_CLASS.WhatsApp} > body > * {
        max-height: 100% !important;
      }
    `;
    (document.head ?? root).appendChild(style);
  }

  root.classList.add(OFFSET_CLASS);
  root.classList.remove(...ALL_PLATFORM_CLASSES);
  root.classList.add(PLATFORM_CLASS[platform]);
}

export function removePageOffset(): void {
  const root = document.documentElement;
  root.classList.remove(OFFSET_CLASS, ...ALL_PLATFORM_CLASSES);
  document.getElementById(STYLE_ID)?.remove();
}
