import type { CaptureSession, Platform } from './capture';

/** Messages sent from the content script to the service worker. */
export type ContentMessage =
  | { type: 'CRM_GET_STATE'; platform: Platform }
  | { type: 'CRM_START'; platform: Platform }
  | { type: 'CRM_SAVE' }
  | { type: 'CRM_FINISH' };

/** Reply shape for state-only messages. */
export interface StateResponse {
  ok: boolean;
  session: CaptureSession | null;
  error?: string;
}

/** Reply to CRM_SAVE. On failure the session is deliberately left intact. */
export interface SaveResponse {
  ok: boolean;
  error?: string;
  /** Present only when "also save TXT" is enabled; the content script downloads it. */
  txt?: { filename: string; contents: string };
}

/** Messages pushed from the service worker down to the content script. */
export interface StatePushMessage {
  type: 'CRM_STATE';
  session: CaptureSession | null;
  /** Optional transient toolbar message, e.g. "Name captured: John Fernando". */
  flash?: string;
  flashTone?: 'success' | 'error';
}

export const isStatePush = (msg: unknown): msg is StatePushMessage =>
  typeof msg === 'object' && msg !== null && (msg as StatePushMessage).type === 'CRM_STATE';
