/** The smallest shape of a DOM element this needs, so it can be tested without a browser. */
export interface TextSource {
  innerText?: string;
  textContent?: string | null;
  getAttribute?: (name: string) => string | null;
}

/** Longer than this is a whole area (a chat list, a message thread), not a single value. */
export const MAX_PICKED_LENGTH = 160;

/**
 * The text of the element the user right-clicked (without selecting). WhatsApp shows some names
 * in elements that can't be selected, and some only in a tooltip (title / aria-label), so those
 * are used when the element has no short visible text of its own.
 */
export function pickedText(el: TextSource | null | undefined): { text: string } | { error: string } {
  if (!el) return { error: 'Nothing there to capture. Right-click right on the text.' };
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

  const visible = clean(el.innerText ?? el.textContent);
  if (visible && visible.length <= MAX_PICKED_LENGTH) return { text: visible };

  const tooltip = clean(el.getAttribute?.('title')) || clean(el.getAttribute?.('aria-label'));
  if (tooltip && tooltip.length <= MAX_PICKED_LENGTH) return { text: tooltip };

  return visible
    ? { error: 'That area holds too much text. Right-click just the name or number.' }
    : { error: 'Nothing there to capture. Right-click right on the text.' };
}
