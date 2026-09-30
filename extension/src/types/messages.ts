import type { CaptureSession, FieldValue, Platform } from './capture';
import type { ConfigBundle } from './growdesk';

/** Messages sent from the content script (toolbar) to the service worker. */
export type ContentMessage =
  | { type: 'GD_GET_STATE'; platform: Platform }
  /** Re-read the field setup from GrowDesk (quietly keeps the cached one if that fails). */
  | { type: 'GD_REFRESH'; platform: Platform }
  | { type: 'GD_START'; platform: Platform }
  | { type: 'GD_SET_VALUE'; key: string; value: FieldValue | null }
  | { type: 'GD_SAVE' }
  | { type: 'GD_DISCARD' }
  | { type: 'GD_OPEN_SETTINGS' }
  /** Opens GrowDesk's animated "How to use GrowDesk Capture" guide in a new tab. */
  | { type: 'GD_OPEN_GUIDE' }
  /** Reload the extension from disk after new files were unzipped over it (Load unpacked installs). */
  | { type: 'GD_RELOAD_EXTENSION' }
  /** Opens chrome://extensions (a web page can't link to it; the extension can). */
  | { type: 'GD_OPEN_EXTENSIONS' };

/** Reply to state-changing messages. */
export interface StateResponse {
  ok: boolean;
  session: CaptureSession | null;
  /** The CRM's field setup; null until connected. */
  bundle: ConfigBundle | null;
  /** True when a server and credentials are saved in the settings. */
  configured: boolean;
  /** How Chrome installed this extension: 'admin' (company policy, updates itself), 'development' (Load unpacked), … */
  installType?: string;
  error?: string;
}

/** Reply to GD_SAVE. On failure the session is deliberately left intact. */
export interface SaveResponse {
  ok: boolean;
  /** "Sarah Fernando was added." / "… was updated." */
  message?: string;
  action?: 'created' | 'updated';
  /** The customer in GrowDesk, for the "saved" card and its Open in GrowDesk link. */
  customerId?: number;
  customerName?: string;
  warnings?: string[];
  error?: string;
  /** The field the CRM rejected, when it named one. */
  field?: string | null;
}

/** Messages pushed from the service worker down to a tab's toolbar. */
export interface StatePushMessage {
  type: 'GD_STATE';
  session: CaptureSession | null;
  bundle: ConfigBundle | null;
  /** Whether a GrowDesk connection is saved in the settings. */
  configured?: boolean;
  /** Optional transient toolbar message, e.g. "Name captured: John Fernando". */
  flash?: string;
  flashTone?: 'success' | 'error';
}

export const isStatePush = (msg: unknown): msg is StatePushMessage =>
  typeof msg === 'object' && msg !== null && (msg as StatePushMessage).type === 'GD_STATE';
