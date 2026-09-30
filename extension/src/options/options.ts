import { GrowDeskError, loadBundle, testConnection } from '../api/growdesk';
import { guideUrl, normalizeServer, originPattern, readSettings, writeSettings, type Settings } from '../storage/settings';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const serverInput = $<HTMLInputElement>('server');
const clientIdInput = $<HTMLInputElement>('clientId');
const secretInput = $<HTMLInputElement>('clientSecret');
const revealButton = $<HTMLButtonElement>('reveal');
const saveButton = $<HTMLButtonElement>('save');
const testButton = $<HTMLButtonElement>('test');
const status = $<HTMLElement>('status');
const insecure = $<HTMLElement>('insecure');
const guideRow = $<HTMLElement>('guide-row');
const guideLink = $<HTMLAnchorElement>('guide');

/** The guide link appears once there's a GrowDesk address to open it from. */
function updateGuideLink(settings: Settings): void {
  const url = guideUrl(settings);
  guideRow.hidden = !url;
  if (url) guideLink.href = url;
}

function setStatus(text: string, kind: 'ok' | 'err' | 'info'): void {
  status.textContent = text;
  status.className = `status show ${kind}`;
}

function current(): Settings {
  return { serverUrl: serverInput.value.trim(), clientId: clientIdInput.value.trim(), clientSecret: secretInput.value.trim() };
}

/** Readable problem with the form, or null. */
function problem(s: Settings): string | null {
  if (!normalizeServer(s.serverUrl)) return 'Enter the GrowDesk address, e.g. http://169.58.92.105:3110.';
  if (!s.clientId) return 'Enter the client ID (it starts with gdc_).';
  if (!s.clientSecret) return 'Enter the client secret (it starts with gds_).';
  return null;
}

function updateInsecureNote(): void {
  insecure.classList.toggle('show', normalizeServer(serverInput.value)?.startsWith('http://') ?? false);
}

async function runTest(settings: Settings): Promise<boolean> {
  setStatus('Connecting to GrowDesk…', 'info');
  try {
    const { connectionName, fieldCount } = await testConnection(settings);
    setStatus(`✓ Connected as “${connectionName}”. The toolbar will collect ${fieldCount} field${fieldCount === 1 ? '' : 's'}.`, 'ok');
    return true;
  } catch (error) {
    setStatus(error instanceof GrowDeskError ? error.message : 'Could not connect. Please try again.', 'err');
    return false;
  }
}

async function load(): Promise<void> {
  const settings = await readSettings();
  serverInput.value = settings.serverUrl;
  clientIdInput.value = settings.clientId;
  secretInput.value = settings.clientSecret;
  updateInsecureNote();
  updateGuideLink(settings);
  if (!settings.serverUrl) setStatus('Not connected yet. Enter the details from GrowDesk and press Save & connect.', 'info');
}

serverInput.addEventListener('input', updateInsecureNote);

revealButton.addEventListener('click', () => {
  const hidden = secretInput.type === 'password';
  secretInput.type = hidden ? 'text' : 'password';
  revealButton.textContent = hidden ? 'Hide' : 'Show';
});

saveButton.addEventListener('click', () => {
  const settings = current();
  const issue = problem(settings);
  if (issue) {
    setStatus(issue, 'err');
    return;
  }
  const server = normalizeServer(settings.serverUrl)!;
  settings.serverUrl = server;
  serverInput.value = server;

  // chrome.permissions.request must be the first call in the click handler: any await before
  // it loses the user gesture and Chrome refuses the prompt.
  chrome.permissions.request({ origins: [originPattern(server)] }, (granted) => {
    void (async () => {
      if (!granted) {
        setStatus(`Chrome was not allowed to reach ${server}, so leads can't be sent. Press Save & connect and choose Allow.`, 'err');
        return;
      }
      saveButton.disabled = true;
      const saved = await writeSettings(settings);
      updateGuideLink(settings);
      if (!saved) {
        saveButton.disabled = false;
        setStatus('Could not save the settings. Please try again.', 'err');
        return;
      }
      if (await runTest(settings)) {
        // Fetch the field setup now, so the right-click menu is ready before the first START.
        await loadBundle().catch(() => undefined);
      }
      saveButton.disabled = false;
    })();
  });
});

testButton.addEventListener('click', () => {
  void (async () => {
    const settings = current();
    const issue = problem(settings);
    if (issue) {
      setStatus(issue, 'err');
      return;
    }
    const server = normalizeServer(settings.serverUrl)!;
    const granted = await chrome.permissions.contains({ origins: [originPattern(server)] }).catch(() => false);
    if (!granted) {
      setStatus('Press Save & connect first, so Chrome allows GrowDesk Capture to reach this address.', 'err');
      return;
    }
    testButton.disabled = true;
    await runTest(settings);
    testButton.disabled = false;
  })();
});

void load();
