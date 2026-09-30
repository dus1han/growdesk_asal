/** A rectangle in viewport coordinates. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** More than this is a whole area (a chat list, a thread), not one value. */
export const MAX_BOX_TEXT = 200;

const inside = (r: DOMRect, b: Box) => {
  const x = (r.left + r.right) / 2;
  const y = (r.top + r.bottom) / 2;
  return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
};
const overlaps = (r: DOMRect, b: Box) => r.right >= b.left && r.left <= b.right && r.bottom >= b.top && r.top <= b.bottom;

/**
 * The words shown inside a box the user drew. Reads the page's text directly, so it works where
 * the site blocks selecting (WhatsApp's Contact info name and number). Only words whose middle
 * falls inside the box count, so a box around a number in a sentence takes just the number.
 * Our own toolbar (`skip`) is never read.
 */
export function textInBox(box: Box, doc: Document = document, skip?: Node | null): string {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (skip && skip.contains(node)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest('script, style, noscript, template')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const range = doc.createRange();
  const words: string[] = [];
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    // Quick reject: the text node isn't anywhere near the box.
    range.selectNodeContents(node);
    const whole = range.getBoundingClientRect();
    if (whole.width === 0 || whole.height === 0 || !overlaps(whole, box)) continue;

    // Word by word, so a box around part of a line takes only that part.
    const text = node.nodeValue ?? '';
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rects = Array.from(range.getClientRects());
      if (rects.some((r) => r.width > 0 && inside(r, box))) words.push(match[0]);
    }
  }
  return words.join(' ').replace(/\s+/g, ' ').trim();
}
