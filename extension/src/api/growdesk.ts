import type { CaptureRequest, CaptureResult, ConfigBundle, ConfigField, Envelope, LatestRelease, Lookup } from '../types/growdesk';
import { isConfigured, normalizeServer, originPattern, readSettings, type Settings } from '../storage/settings';

/**
 * The GrowDesk Capture API client (GrowDesk docs/CAPTURE_API.md). Runs only in the service
 * worker or the options page: those bypass CORS for the granted GrowDesk origin, a content
 * script would not.
 *
 * Flow: client ID + secret → 15-minute token (cached per browser session) → Bearer calls. A 401
 * gets one fresh token and one retry; a second 401 means the connection was revoked.
 */

const TOKEN_KEY = 'growdesk-capture-token';
const BUNDLE_KEY = 'growdesk-capture-config';
const TIMEOUT_MS = 20_000;

export class GrowDeskError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly field: string | null = null,
  ) {
    super(message);
    this.name = 'GrowDeskError';
  }
}

interface CachedToken {
  server: string;
  clientId: string;
  token: string;
  expiresAt: number;
}

async function readToken(): Promise<CachedToken | null> {
  try {
    const stored = await chrome.storage.session.get(TOKEN_KEY);
    return (stored[TOKEN_KEY] as CachedToken | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function forgetToken(): Promise<void> {
  try {
    await chrome.storage.session.remove(TOKEN_KEY);
  } catch {
    // Nothing cached.
  }
}

interface Reply<T> {
  data: T;
  message: string | null;
}

/** One HTTP call, with the CRM envelope unwrapped and every failure turned into a readable message. */
async function call<T>(server: string, path: string, init: RequestInit): Promise<T> {
  return (await callWithMessage<T>(server, path, init)).data;
}

async function callWithMessage<T>(server: string, path: string, init: RequestInit): Promise<Reply<T>> {
  let response: Response;
  try {
    response = await fetch(`${server}/api${path}`, { ...init, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new GrowDeskError(
      timedOut ? `GrowDesk at ${new URL(server).host} took too long to answer.` : `Can't reach GrowDesk at ${new URL(server).host}. Check the internet connection.`,
      0,
    );
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    // Not the CRM (a proxy error page, or the wrong address).
  }

  if (response.ok && body?.success) return { data: body.data as T, message: body.message };
  if (!body) {
    throw new GrowDeskError(
      response.status === 404 ? 'That address is not a GrowDesk server. Check the server in the settings.' : `GrowDesk answered with an error (HTTP ${response.status}).`,
      response.status,
    );
  }
  throw new GrowDeskError(body.message ?? `GrowDesk answered with an error (HTTP ${response.status}).`, response.status, body.errors?.[0]?.field ?? null);
}

async function fetchToken(settings: Settings, server: string): Promise<CachedToken> {
  try {
    const data = await call<{ accessToken: string; expiresIn: number }>(server, '/capture/token', {
      method: 'POST',
      // The version lets the admin see which PCs need updating (Connections list).
      headers: { 'Content-Type': 'application/json', 'X-GrowDesk-Capture-Version': chrome.runtime.getManifest().version },
      body: JSON.stringify({ clientId: settings.clientId.trim(), clientSecret: settings.clientSecret.trim() }),
    });
    const token: CachedToken = {
      server,
      clientId: settings.clientId.trim(),
      token: data.accessToken,
      // Renew a minute early so a token never expires mid-request.
      expiresAt: Date.now() + (data.expiresIn - 60) * 1000,
    };
    await chrome.storage.session.set({ [TOKEN_KEY]: token }).catch(() => undefined);
    return token;
  } catch (error) {
    if (error instanceof GrowDeskError && error.status === 401) {
      throw new GrowDeskError('GrowDesk refused this connection. Check the client ID and secret, or ask the admin whether it was revoked.', 401);
    }
    throw error;
  }
}

/** Settings plus a usable server origin, or a clear error when setup is incomplete. */
async function connection(): Promise<{ settings: Settings; server: string }> {
  const settings = await readSettings();
  const server = normalizeServer(settings.serverUrl);
  if (!isConfigured(settings) || !server) {
    throw new GrowDeskError('GrowDesk Capture is not set up. Click the extension icon to connect it.', 0);
  }
  const granted = await chrome.permissions.contains({ origins: [originPattern(server)] }).catch(() => false);
  if (!granted) {
    throw new GrowDeskError('Chrome has not been allowed to reach GrowDesk. Open the settings and press Save & connect.', 0);
  }
  return { settings, server };
}

/** An authenticated call: cached token, renewed once if GrowDesk says it has expired. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await authedWithMessage<T>(path, init)).data;
}

async function authedWithMessage<T>(path: string, init: RequestInit = {}): Promise<Reply<T>> {
  const { settings, server } = await connection();
  let token = await readToken();
  if (!token || token.server !== server || token.clientId !== settings.clientId.trim() || token.expiresAt < Date.now()) {
    token = await fetchToken(settings, server);
  }

  const withAuth = (t: CachedToken): RequestInit => ({
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t.token}` },
  });

  try {
    return await callWithMessage<T>(server, path, withAuth(token));
  } catch (error) {
    if (!(error instanceof GrowDeskError) || error.status !== 401) throw error;
    await forgetToken();
    token = await fetchToken(settings, server);
    return callWithMessage<T>(server, path, withAuth(token));
  }
}

/** The field setup and lists, fetched fresh (and cached for the context menu). */
export async function loadBundle(): Promise<ConfigBundle> {
  const { server } = await connection();
  const [config, treatments, stages, sources] = await Promise.all([
    authed<{ fields: ConfigField[] }>('/capture/config'),
    authed<Lookup[]>('/capture/treatments'),
    authed<Lookup[]>('/capture/stages'),
    authed<Lookup[]>('/capture/sources'),
  ]);
  const bundle: ConfigBundle = {
    server,
    fields: config.fields,
    treatments,
    stages,
    sources,
    fetchedAt: new Date().toISOString(),
    latest: await latestRelease(server),
  };
  // Only store a real change: the store triggers a context-menu rebuild in the service worker.
  const previous = await cachedBundle();
  const same = (x: ConfigBundle | null) => (x ? JSON.stringify({ ...x, fetchedAt: '' }) : '');
  if (same(previous) !== same(bundle)) await chrome.storage.local.set({ [BUNDLE_KEY]: bundle }).catch(() => undefined);
  return bundle;
}

/** The newest toolbar GrowDesk offers. Missing or unreadable just means no update notice. */
async function latestRelease(server: string): Promise<LatestRelease | null> {
  try {
    const response = await fetch(`${server}/capture/latest.json`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<LatestRelease>;
    return typeof data.version === 'string' && typeof data.download === 'string'
      ? { version: data.version, download: data.download, guide: data.guide ?? `${server}/capture-guide` }
      : null;
  } catch {
    return null;
  }
}

/** The last fetched setup, if any. Used to rebuild the context menu after the worker sleeps. */
export async function cachedBundle(): Promise<ConfigBundle | null> {
  try {
    const stored = await chrome.storage.local.get(BUNDLE_KEY);
    return (stored[BUNDLE_KEY] as ConfigBundle | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function clearCachedBundle(): Promise<void> {
  await chrome.storage.local.remove(BUNDLE_KEY).catch(() => undefined);
}

/** Sends one lead. The reply's message reads "Sarah Fernando was added." or "… was updated." */
export async function sendLead(request: CaptureRequest): Promise<CaptureResult & { message: string | null }> {
  const reply = await authedWithMessage<CaptureResult>('/capture/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return { ...reply.data, message: reply.message };
}

/** Test used by the options page: token, then the field setup. Returns the connection's name. */
export async function testConnection(settings: Settings): Promise<{ connectionName: string; fieldCount: number }> {
  const server = normalizeServer(settings.serverUrl);
  if (!server) throw new GrowDeskError('Enter the GrowDesk address, e.g. http://169.58.92.105:3110.', 0);
  await forgetToken();
  const token = await fetchToken(settings, server);
  const config = await call<{ fields: ConfigField[] }>(server, '/capture/config', {
    headers: { Authorization: `Bearer ${token.token}` },
  });
  return { connectionName: tokenName(token.token) ?? 'this connection', fieldCount: config.fields.filter((f) => f.enabled).length };
}

/** The connection name carried in the token (set by the admin, e.g. "Reception PC"). */
function tokenName(jwt: string): string | null {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { name?: string };
    return payload.name ?? null;
  } catch {
    return null;
  }
}
