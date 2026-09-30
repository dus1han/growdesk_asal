import type { ApiEnvelope, ApiFieldError } from "@/types/api";

/** Dispatched on any 401 so the auth layer can end the session in one place. */
export const UNAUTHORIZED_EVENT = "growdesk:unauthorized";

const FRIENDLY_FALLBACK = "Something went wrong. Please try again.";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** Set for calls where a 401 is an expected answer (e.g. login), not an expired session. */
  skipUnauthorizedEvent?: boolean;
}

/**
 * The only function in the app that calls fetch. Requests go to /api/* on the Next.js server,
 * which forwards them to the backend, so the HTTP-only session cookie is sent automatically.
 */
async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON body (e.g. a proxy error page). Fall through to the friendly message.
  }

  if (response.status === 401 && !options.skipUnauthorizedEvent && typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok || !envelope?.success) {
    // 5xx messages are already generic from the backend; anything unexpected becomes the fallback.
    const message = envelope?.message ?? FRIENDLY_FALLBACK;
    throw new ApiError(message, response.status, envelope?.errors ?? []);
  }

  return envelope.data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
