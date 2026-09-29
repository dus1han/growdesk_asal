import {
  isConfigured,
  readSettings,
  writeSettings,
  type Settings,
} from '../storage/settings';
import { pushLead } from '../utils/sheets';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const urlInput = $<HTMLInputElement>('url');
const secretInput = $<HTMLInputElement>('secret');
const deviceInput = $<HTMLInputElement>('device');
const txtInput = $<HTMLInputElement>('txt');
const saveButton = $<HTMLButtonElement>('save');
const testButton = $<HTMLButtonElement>('test');
const status = $<HTMLElement>('status');

function setStatus(text: string, kind: 'ok' | 'err' | 'info' = 'info'): void {
  status.textContent = text;
  status.className = kind;
}

/** Reads the form back into a Settings object. */
function currentSettings(): Settings {
  return {
    webAppUrl: urlInput.value.trim(),
    sharedSecret: secretInput.value,
    deviceLabel: deviceInput.value.trim(),
    alsoSaveTxt: txtInput.checked,
  };
}

async function load(): Promise<void> {
  const settings = await readSettings();
  urlInput.value = settings.webAppUrl;
  secretInput.value = settings.sharedSecret;
  deviceInput.value = settings.deviceLabel;
  txtInput.checked = settings.alsoSaveTxt;
  if (!settings.webAppUrl) {
    setStatus('Not connected yet - follow the setup steps below.', 'info');
  }
}

saveButton.addEventListener('click', () => {
  void (async () => {
    const settings = currentSettings();
    if (settings.webAppUrl && !isConfigured(settings)) {
      setStatus('That does not look like an Apps Script /exec URL.', 'err');
      return;
    }
    saveButton.disabled = true;
    const saved = await writeSettings(settings);
    saveButton.disabled = false;
    setStatus(saved ? 'Saved.' : 'Could not save settings - see console.', saved ? 'ok' : 'err');
  })();
});

testButton.addEventListener('click', () => {
  void (async () => {
    const settings = currentSettings();
    if (!isConfigured(settings)) {
      setStatus('Enter the Apps Script /exec URL first.', 'err');
      return;
    }
    testButton.disabled = true;
    setStatus('Testing…', 'info');
    // test:true asks the script to verify the secret without appending a row.
    const result = await pushLead(settings, { test: true });
    testButton.disabled = false;
    setStatus(
      result.ok ? '✓ Connected. The sheet accepted the secret.' : result.error ?? 'Failed.',
      result.ok ? 'ok' : 'err',
    );
  })();
});

void load();
