import type { CaptureField } from '../types/capture';

/**
 * Light normalisation only — this prototype deliberately keeps whatever the
 * user highlighted rather than trying to parse numbers or usernames.
 */
export function normalizeSelection(field: CaptureField, raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (field !== 'instagramName') return text;

  // Accept "@handle", "handle" and "instagram.com/handle" without over-parsing.
  const fromUrl = text.match(/(?:^|\/\/)(?:www\.)?instagram\.com\/([^/?#\s]+)/i);
  if (fromUrl?.[1]) return `@${fromUrl[1].replace(/^@/, '')}`;
  return text;
}

/** Human-readable label used in toolbar flash messages. */
export const FIELD_LABEL: Record<CaptureField, string> = {
  name: 'Name',
  number: 'Number',
  instagramName: 'Insta Name',
};
