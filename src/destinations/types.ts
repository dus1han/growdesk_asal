import type { Lead } from '../types/lead';

/** Endpoint settings shared by every destination adapter. */
export interface DestinationConfig {
  endpointUrl: string;
  /** Header carrying the credential, e.g. "Authorization" or "X-API-Key". */
  authHeaderName: string;
  authToken: string;
}

export interface PushResult {
  ok: boolean;
  error?: string;
}

export interface PushRequest {
  url: string;
  init: RequestInit;
}

/**
 * A place leads can be sent.
 *
 * Adding a CRM means adding one file implementing this and registering it in
 * ./index.ts - nothing in the toolbar, service worker or options page changes.
 */
export interface Destination {
  /** Stable id stored in settings. Never rename an existing one. */
  id: string;
  /** Shown in the options page picker. */
  label: string;
  /** One line of guidance shown under the picker. */
  help: string;
  /** Default header name suggested when this destination is selected. */
  defaultAuthHeader: string;
  /** Returns a human-readable problem, or null when the config is usable. */
  validate(config: DestinationConfig): string | null;
  /** Builds the HTTP request that delivers one lead. */
  buildRequest(lead: Lead, config: DestinationConfig): PushRequest;
  /** Turns the HTTP reply into a result. Called for every status code. */
  interpretResponse(status: number, body: string): PushResult;
  /**
   * Optional connection test. Returning null means "no test possible", and
   * the options page says so rather than implying success.
   */
  buildTestRequest?(config: DestinationConfig): PushRequest | null;
}
