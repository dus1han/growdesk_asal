import type { Destination, DestinationConfig, PushRequest, PushResult } from './types';
import type { Lead } from '../types/lead';

/**
 * Generic REST / webhook destination: POSTs the lead as JSON, optionally with
 * a credential header. Works with most CRMs that expose an inbound endpoint,
 * and with relay services (Zapier, Make, a small internal API).
 *
 * Chosen as the default because it needs no vendor SDK and no OAuth flow.
 */
function buildHeaders(config: DestinationConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const name = config.authHeaderName.trim();
  const token = config.authToken.trim();
  if (name && token) headers[name] = token;
  return headers;
}

export const webhookDestination: Destination = {
  id: 'webhook',
  label: 'Generic REST endpoint / webhook',
  help: 'POSTs the lead as JSON. Set the credential header your CRM expects, e.g. Authorization with a Bearer token.',
  defaultAuthHeader: 'Authorization',

  validate(config) {
    const url = config.endpointUrl.trim();
    if (!url) return 'Enter the endpoint URL your CRM accepts leads on.';
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return 'That is not a valid URL.';
    }
    if (parsed.protocol !== 'https:') return 'The endpoint must use https.';
    if (config.authToken.trim() && !config.authHeaderName.trim()) {
      return 'Enter the header name the token should be sent in.';
    }
    return null;
  },

  buildRequest(lead: Lead, config): PushRequest {
    return {
      url: config.endpointUrl.trim(),
      init: {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({ lead }),
      },
    };
  },

  buildTestRequest(config): PushRequest {
    // A clearly-marked probe rather than a fake lead, so a CRM that accepts it
    // does not end up holding a junk record.
    return {
      url: config.endpointUrl.trim(),
      init: {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({ test: true, source: 'CRM Capture connection test' }),
      },
    };
  },

  interpretResponse(status, body): PushResult {
    if (status >= 200 && status < 300) return { ok: true };
    if (status === 401 || status === 403) {
      return {
        ok: false,
        error: 'Rejected (HTTP ' + status + '). Check the credential header and token.',
      };
    }
    if (status === 404) return { ok: false, error: 'Endpoint not found (HTTP 404). Check the URL.' };
    const detail = body.trim().slice(0, 140);
    return {
      ok: false,
      error: 'Endpoint returned HTTP ' + status + (detail ? ': ' + detail : '.'),
    };
  },
};
