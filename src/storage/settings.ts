import { DEFAULT_DESTINATION_ID, getDestination } from '../destinations';

/**
 * Where leads are sent, configured at runtime rather than baked into the
 * build - the endpoint and token together are a write credential.
 */
export interface Settings {
  /** Which destination adapter to use. See src/destinations/index.ts. */
  destinationId: string;
  endpointUrl: string;
  /** Header carrying the credential, e.g. "Authorization". */
  authHeaderName: string;
  authToken: string;
  /** Optional label identifying which PC a lead came from. */
  deviceLabel: string;
  /** Also download a TXT copy on STOP. Off by default. */
  alsoSaveTxt: boolean;
}

const KEY = 'crm-capture-settings';

export const DEFAULT_SETTINGS: Settings = {
  destinationId: DEFAULT_DESTINATION_ID,
  endpointUrl: '',
  authHeaderName: 'Authorization',
  authToken: '',
  deviceLabel: '',
  alsoSaveTxt: false,
};

export async function readSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.local.get(KEY);
    return { ...DEFAULT_SETTINGS, ...((stored[KEY] as Partial<Settings>) ?? {}) };
  } catch (error) {
    console.error('[CRM Capture] Failed to read settings.', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(settings: Settings): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [KEY]: settings });
    return true;
  } catch (error) {
    console.error('[CRM Capture] Failed to save settings.', error);
    return false;
  }
}

/** True when the selected destination considers the settings usable. */
export function isConfigured(settings: Settings): boolean {
  return (
    getDestination(settings.destinationId).validate({
      endpointUrl: settings.endpointUrl,
      authHeaderName: settings.authHeaderName,
      authToken: settings.authToken,
    }) === null
  );
}
