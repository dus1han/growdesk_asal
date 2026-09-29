// End-to-end check against the running browser: START -> capture -> STOP,
// asserting the toolbar state machine and the real TXT download.
//
// The right-click itself is native Chrome UI and cannot be driven remotely, so
// that one step is simulated exactly as the service worker's onClicked handler
// does it - same storage write, same push to the content script. Everything
// else is the real code path.
//
// Requires "npm start" to be running. Usage: node scripts/verify-e2e.mjs
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const PORT = Number(process.env.CRM_CAPTURE_DEBUG_PORT ?? 9222);
const EXT_ID = 'mnhjjndckpjiglmdlpelboiebdjcfaid';
const DOWNLOAD_DIR = mkdtempSync(resolve(tmpdir(), 'crm-capture-'));

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(38)} ${detail}`);
};

/** Minimal CDP client over one target's WebSocket. */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const myId = ++id;
      const on = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id !== myId) return;
        ws.removeEventListener('message', on);
        if (msg.error) return rej(new Error(msg.error.message));
        res(msg.result);
      };
      ws.addEventListener('message', on);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.result?.subtype === 'error') throw new Error(r.result.description);
    return r.result?.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
// Prefer an Instagram tab so a live WhatsApp session is left undisturbed.
const candidates = targets.filter(
  (t) => t.type === 'page' && /web\.whatsapp\.com|instagram\.com/.test(t.url ?? ''),
);
const pageTarget =
  candidates.find((t) => /instagram\.com/.test(t.url ?? '')) ?? candidates[0];
if (!pageTarget) {
  console.error('[e2e] No WhatsApp/Instagram page open. Run "npm start" first.');
  process.exit(1);
}

/**
 * MV3 service workers idle out after ~30s and then have no debug target.
 * Reloading the page makes the content script message the worker, which wakes
 * it; poll until its target reappears.
 */
async function findServiceWorker() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
    const found = list.find((t) => (t.url ?? '').includes(EXT_ID));
    if (found) return found;

    console.log('[e2e] service worker asleep - waking it via a page reload...');
    const waker = await connect(pageTarget.webSocketDebuggerUrl);
    await waker.evaluate('location.reload(), true').catch(() => {});
    waker.close();
    await sleep(6000);
  }
  return null;
}

const swTarget = await findServiceWorker();
if (!swTarget) {
  console.error('[e2e] Extension service worker not found. Is the extension loaded?');
  process.exit(1);
}

// The reload replaces the page target, so re-resolve it before connecting.
const freshTargets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const livePage =
  freshTargets.find((t) => t.type === 'page' && t.url === pageTarget.url) ?? pageTarget;
pageTarget.webSocketDebuggerUrl = livePage.webSocketDebuggerUrl;

console.log(`[e2e] page   : ${pageTarget.url}`);
console.log(`[e2e] worker : ${swTarget.url}`);
console.log(`[e2e] saving downloads to ${DOWNLOAD_DIR}\n`);

const page = await connect(pageTarget.webSocketDebuggerUrl);
const sw = await connect(swTarget.webSocketDebuggerUrl);

await page.send('Page.enable').catch(() => {});
await page
  .send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOAD_DIR })
  .catch(() => {});

/** Reads the toolbar's rendered state out of the shadow root. */
const readToolbar = () =>
  page.evaluate(`(() => {
    const bar = document.getElementById('crm-capture-toolbar-host').shadowRoot.querySelector('.crm-bar');
    const btn = bar.querySelector('.crm-btn');
    return {
      chip: bar.querySelector('.crm-chip').textContent.trim(),
      fields: [...bar.querySelectorAll('.crm-field')].map(f => f.textContent.trim()),
      status: bar.querySelector('.crm-status').textContent.trim(),
      button: btn.textContent.trim(),
      disabled: btn.disabled,
    };
  })()`);

const clickButton = () =>
  page.evaluate(
    `document.getElementById('crm-capture-toolbar-host').shadowRoot.querySelector('.crm-btn').click(), true`,
  );

/** Mirrors what the service worker does on a "Set as ..." context-menu click. */
const PAGE_URL_PATTERN = /instagram/.test(pageTarget.url)
  ? "'https://www.instagram.com/*'"
  : "'https://web.whatsapp.com/*'";

const simulateCapture = (field, value) =>
  sw.evaluate(`(async () => {
    const [tab] = await chrome.tabs.query({ url: [${PAGE_URL_PATTERN}] });
    const key = 'crm-capture-session-' + tab.id;
    const stored = await chrome.storage.session.get(key);
    const session = { ...stored[key], ${field}: ${JSON.stringify(value)} };
    await chrome.storage.session.set({ [key]: session });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CRM_STATE', session, flash: 'captured', flashTone: 'success',
    });
    return session;
  })()`);

// --- 0. Reset any session left over from manual testing -------------------
await sw.evaluate(`(async () => {
  const [tab] = await chrome.tabs.query({ url: [${PAGE_URL_PATTERN}] });
  await chrome.storage.session.clear();
  await chrome.tabs.sendMessage(tab.id, { type: 'CRM_STATE', session: null });
  return true;
})()`).catch(() => {});
await sleep(500);

// --- 1. Inactive baseline -------------------------------------------------
let ui = await readToolbar();
check('starts inactive', ui.button === 'START', ui.button);
check('shows platform chip', /WhatsApp|Instagram/.test(ui.chip), ui.chip);

// --- 2. START -------------------------------------------------------------
await clickButton();
await sleep(600);
ui = await readToolbar();
check('START activates capture', ui.button === 'STOP', ui.button);
check('shows ACTIVE', ui.chip.includes('ACTIVE'), ui.chip);
check('Test 6 - nothing captured: STOP disabled', ui.disabled === true, `disabled=${ui.disabled}`);

// The START flash owns the status line for FLASH_MS; the standing hint shows
// once it clears. Wait it out rather than racing it.
await sleep(1800);
ui = await readToolbar();
check(
  'hint explains why STOP is off',
  ui.status.includes('Capture a Number or Insta Name'),
  JSON.stringify(ui.status),
);

// --- 3. Name only (spec Test 5) ------------------------------------------
await simulateCapture('name', 'John Fernando');
await sleep(400);
ui = await readToolbar();
check('Name tick set', ui.fields[0].includes('✓'), ui.fields[0]);
check('Test 5 - Name only: STOP still disabled', ui.disabled === true, `disabled=${ui.disabled}`);

// --- 4. Number (spec Test 1) ---------------------------------------------
await simulateCapture('number', '+94 77 123 4567');
await sleep(400);
ui = await readToolbar();
check('Number tick set', ui.fields[1].includes('✓'), ui.fields[1]);
check('Test 1 - Name+Number: STOP enabled', ui.disabled === false, `disabled=${ui.disabled}`);

// --- 5. Instagram name (spec Test 7) -------------------------------------
await simulateCapture('instagramName', '@johnfernando');
await sleep(400);
ui = await readToolbar();
check('Insta tick set', ui.fields[2].includes('✓'), ui.fields[2]);
check('Test 7 - all three captured', ui.fields.every((f) => f.includes('✓')), ui.fields.join(' '));

// --- 6. STOP downloads the TXT -------------------------------------------
await clickButton();
await sleep(2500);

const files = existsSync(DOWNLOAD_DIR) ? readdirSync(DOWNLOAD_DIR).filter((f) => f.endsWith('.txt')) : [];
check('STOP produced a .txt', files.length === 1, files.join(', ') || 'none');

if (files.length === 1) {
  const name = files[0];
  check(
    'filename lead-YYYY-MM-DD-HH-mm-ss.txt',
    /^lead-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/.test(name),
    name,
  );
  const body = readFileSync(resolve(DOWNLOAD_DIR, name), 'utf8');
  console.log('\n--- downloaded file ---\n' + body + '-----------------------\n');
  check('Name line', body.includes('Name: John Fernando'));
  check('Number line', body.includes('Number: +94 77 123 4567'));
  check('Instagram line', body.includes('Instagram Name: @johnfernando'));
  check('Source line', /^Source: (WhatsApp|Instagram)$/m.test(body));
  check('Captured At line', /^Captured At: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/m.test(body));
}

// --- 7. Reset after save --------------------------------------------------
await sleep(2200);
ui = await readToolbar();
check('returns to START', ui.button === 'START', ui.button);
check('ticks cleared', ui.fields.every((f) => f.includes('○')), ui.fields.join(' '));

const leftover = await sw.evaluate(
  `chrome.storage.session.get(null).then(o => Object.keys(o).length)`,
);
check('session storage cleared', leftover === 0, `${leftover} keys`);

page.close();
sw.close();

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} end-to-end checks passed`);
process.exit(failed ? 1 : 0);
