import type { ConfigField } from '../types/growdesk';

/**
 * Light tidying of highlighted text. GrowDesk does the real normalisation (country codes,
 * Instagram handles), so this only removes what a selection drags along with it.
 */
export function normalizeSelection(field: Pick<ConfigField, 'key' | 'type'>, raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (field.key !== 'instagram') return text;

  // Accept "@handle", "handle" and "instagram.com/handle" without over-parsing.
  const fromUrl = text.match(/(?:^|\/\/)(?:www\.)?instagram\.com\/([^/?#\s]+)/i);
  if (fromUrl?.[1]) return `@${fromUrl[1].replace(/^@/, '')}`;
  return text;
}

/** Notes collect several highlights; every other field takes the latest one. */
export function mergeHighlight(field: Pick<ConfigField, 'type'>, previous: unknown, next: string): string {
  if (field.type === 'textarea' && typeof previous === 'string' && previous.trim() && !previous.includes(next)) {
    return `${previous}\n${next}`;
  }
  return next;
}
