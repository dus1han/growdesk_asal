import type { Platform } from '../types/capture';

const WHATSAPP_HOST = 'web.whatsapp.com';
const INSTAGRAM_HOST_SUFFIX = 'instagram.com';

/** Maps a hostname to a supported platform, or null when unsupported. */
export function platformFromHostname(hostname: string): Platform | null {
  const host = hostname.toLowerCase();
  if (host === WHATSAPP_HOST) return 'WhatsApp';
  if (host === INSTAGRAM_HOST_SUFFIX || host.endsWith(`.${INSTAGRAM_HOST_SUFFIX}`)) {
    return 'Instagram';
  }
  return null;
}

/** Maps a full URL to a supported platform, or null when unsupported. */
export function platformFromUrl(url: string | undefined): Platform | null {
  if (!url) return null;
  try {
    return platformFromHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** Platform of the page the content script is running in. */
export function detectPlatform(): Platform | null {
  return platformFromHostname(window.location.hostname);
}
