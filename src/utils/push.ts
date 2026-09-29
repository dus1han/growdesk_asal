import { getDestination } from '../destinations';
import type { PushResult } from '../destinations/types';
import type { Lead } from '../types/lead';
import type { Settings } from '../storage/settings';

const TIMEOUT_MS = 20_000;

/** The origin pattern that must be granted before we can reach an endpoint. */
export function originPatternFor(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return parsed.origin + '/*';
  } catch {
    return null;
  }
}

/** True when the user has granted access to this endpoint's origin. */
export async function hasOriginPermission(url: string): Promise<boolean> {
  const pattern = originPatternFor(url);
  if (!pattern) return false;
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch (error) {
    console.error('[CRM Capture] Permission check failed.', error);
    return false;
  }
}

/**
 * Sends one lead (or a connection probe) to the configured destination.
 *
 * Must run in the service worker or an extension page: only those bypass CORS
 * for granted origins. A content script would be blocked by the page's rules.
 */
export async function pushToDestination(
  settings: Settings,
  payload: { lead?: Lead; test?: boolean },
): Promise<PushResult> {
  const destination = getDestination(settings.destinationId);
  const config = {
    endpointUrl: settings.endpointUrl,
    authHeaderName: settings.authHeaderName,
    authToken: settings.authToken,
  };

  const problem = destination.validate(config);
  if (problem) return { ok: false, error: problem };

  if (!(await hasOriginPermission(config.endpointUrl))) {
    return {
      ok: false,
      error: 'Access to that endpoint has not been granted. Open options and press Save to grant it.',
    };
  }

  const request = payload.test
    ? (destination.buildTestRequest?.(config) ?? null)
    : destination.buildRequest(payload.lead as Lead, config);

  if (!request) return { ok: false, error: 'This destination has no connection test.' };

  try {
    const response = await fetch(request.url, {
      ...request.init,
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.text().catch(() => '');
    return destination.interpretResponse(response.status, body);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'Timed out reaching the endpoint.'
        : 'Could not reach the endpoint: ' +
          (error instanceof Error ? error.message : 'unknown error');
    console.error('[CRM Capture] Push failed.', error);
    return { ok: false, error: message };
  }
}
