import { DESTINATIONS, getDestination } from '../destinations';
import { readSettings, writeSettings, type Settings } from '../storage/settings';
import { buildLead } from '../types/lead';
import { originPatternFor, pushToDestination } from '../utils/push';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const destinationSelect = $<HTMLSelectElement>('destination');
const destinationHelp = $<HTMLElement>('destination-help');
const endpointInput = $<HTMLInputElement>('endpoint');
const headerInput = $<HTMLInputElement>('header');
const tokenInput = $<HTMLInputElement>('token');
const deviceInput = $<HTMLInputElement>('device');
const txtInput = $<HTMLInputElement>('txt');
const saveButton = $<HTMLButtonElement>('save');
const testButton = $<HTMLButtonElement>('test');
const status = $<HTMLElement>('status');
const sample = $<HTMLElement>('sample');

function setStatus(text: string, kind: 'ok' | 'err' | 'info' = 'info'): void {
  status.textContent = text;
  status.className = kind;
}

function currentSettings(): Settings {
  return {
    destinationId: destinationSelect.value,
    endpointUrl: endpointInput.value.trim(),
    authHeaderName: headerInput.value.trim(),
    authToken: tokenInput.value,
    deviceLabel: deviceInput.value.trim(),
    alsoSaveTxt: txtInput.checked,
  };
}

/** Shows the exact JSON body the CRM will receive, using the live settings. */
function renderSample(): void {
  const destination = getDestination(destinationSelect.value);
  destinationHelp.textContent = destination.help;

  const lead = buildLead(
    {
      active: true,
      source: 'WhatsApp',
      name: 'John Fernando',
      number: '+94 77 123 4567',
      instagramName: '@johnfernando',
    },
    new Date(),
    deviceInput.value.trim() || 'This PC',
  );

  const request = destination.buildRequest(lead, {
    endpointUrl: endpointInput.value.trim() || 'https://crm.example.com/api/leads',
    authHeaderName: headerInput.value.trim(),
    authToken: tokenInput.value ? '<token>' : '',
  });

  const headers = request.init.headers as Record<string, string>;
  const headerLines = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
  const body = JSON.stringify(JSON.parse(String(request.init.body)), null, 2);
  sample.textContent = `POST ${request.url}\n${headerLines.join('\n')}\n\n${body}`;
}

async function load(): Promise<void> {
  destinationSelect.innerHTML = '';
  for (const destination of DESTINATIONS) {
    const option = document.createElement('option');
    option.value = destination.id;
    option.textContent = destination.label;
    destinationSelect.appendChild(option);
  }

  const settings = await readSettings();
  destinationSelect.value = settings.destinationId;
  endpointInput.value = settings.endpointUrl;
  headerInput.value = settings.authHeaderName;
  tokenInput.value = settings.authToken;
  deviceInput.value = settings.deviceLabel;
  txtInput.checked = settings.alsoSaveTxt;

  renderSample();
  if (!settings.endpointUrl) {
    setStatus('Not connected yet - enter your CRM endpoint and press Save.', 'info');
  }
}

for (const input of [endpointInput, headerInput, tokenInput, deviceInput]) {
  input.addEventListener('input', renderSample);
}
destinationSelect.addEventListener('change', () => {
  // Offer the newly selected adapter's conventional header when none is set.
  if (!headerInput.value.trim()) {
    headerInput.value = getDestination(destinationSelect.value).defaultAuthHeader;
  }
  renderSample();
});

saveButton.addEventListener('click', () => {
  const settings = currentSettings();
  const destination = getDestination(settings.destinationId);
  const problem = destination.validate({
    endpointUrl: settings.endpointUrl,
    authHeaderName: settings.authHeaderName,
    authToken: settings.authToken,
  });
  if (problem) {
    setStatus(problem, 'err');
    return;
  }

  const pattern = originPatternFor(settings.endpointUrl);
  if (!pattern) {
    setStatus('Could not derive a host from that URL.', 'err');
    return;
  }

  // chrome.permissions.request must be the first call in the click handler:
  // any await before it loses the user gesture and Chrome refuses the prompt.
  chrome.permissions.request({ origins: [pattern] }, (granted) => {
    void (async () => {
      if (!granted) {
        setStatus(`Permission to reach ${pattern} was declined. Leads cannot be sent.`, 'err');
        return;
      }
      saveButton.disabled = true;
      const saved = await writeSettings(settings);
      saveButton.disabled = false;
      setStatus(saved ? 'Saved.' : 'Could not save settings - see console.', saved ? 'ok' : 'err');
    })();
  });
});

testButton.addEventListener('click', () => {
  void (async () => {
    const settings = currentSettings();
    const problem = getDestination(settings.destinationId).validate({
      endpointUrl: settings.endpointUrl,
      authHeaderName: settings.authHeaderName,
      authToken: settings.authToken,
    });
    if (problem) {
      setStatus(problem, 'err');
      return;
    }
    testButton.disabled = true;
    setStatus('Testing…', 'info');
    const result = await pushToDestination(settings, { test: true });
    testButton.disabled = false;
    setStatus(
      result.ok ? '✓ Endpoint accepted the test request.' : (result.error ?? 'Failed.'),
      result.ok ? 'ok' : 'err',
    );
  })();
});

void load();
