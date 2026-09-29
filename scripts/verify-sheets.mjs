// Checks the Google Sheet push paths that do not need a real sheet:
// the options page renders, and a failed push never discards a capture.
//
// The happy path needs a live Apps Script Web App - configure one in the
// options page and press STOP to confirm it.
//
// Requires "npm start" to be running. Usage: node scripts/verify-sheets.mjs
const PORT = Number(process.env.CRM_CAPTURE_DEBUG_PORT ?? 9222);
const EXT_ID = 'mnhjjndckpjiglmdlpelboiebdjcfaid';
const SETTINGS_KEY = 'crm-capture-settings';

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = () => fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const my = ++id;
      const on = (e) => {
        const m = JSON.parse(e.data);
        if (m.id !== my) return;
        ws.removeEventListener('message', on);
        if (m.error) return rej(new Error(m.error.message));
        res(m.result);
      };
      ws.addEventListener('message', on);
      ws.send(JSON.stringify({ id: my, method, params }));
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

const targets = await list();
const pageTarget = targets.find(
  (t) => t.type === 'page' && /web\.whatsapp\.com|instagram\.com/.test(t.url ?? ''),
);
if (!pageTarget) {
  console.error('[sheets] No WhatsApp/Instagram page open. Run "npm start" first.');
  process.exit(1);
}

/** Wakes the MV3 worker if it has idled out, then returns its target. */
async function findWorker() {
  for (let i = 0; i < 3; i += 1) {
    const found = (await list()).find((t) => (t.url ?? '').includes(EXT_ID));
    if (found) return found;
    const waker = await connect(pageTarget.webSocketDebuggerUrl);
    await waker.evaluate('location.reload(), true').catch(() => {});
    waker.close();
    await sleep(6000);
  }
  return null;
}

const swTarget = await findWorker();
if (!swTarget) {
  console.error('[sheets] Extension service worker not found.');
  process.exit(1);
}

const live = (await list()).find((t) => t.type === 'page' && t.url === pageTarget.url) ?? pageTarget;
const page = await connect(live.webSocketDebuggerUrl);
const sw = await connect(swTarget.webSocketDebuggerUrl);

const readToolbar = () =>
  page.evaluate(`(() => {
    const bar = document.getElementById('crm-capture-toolbar-host').shadowRoot.querySelector('.crm-bar');
    const btn = bar.querySelector('.crm-btn');
    return {
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

const setSettings = (settings) =>
  sw.evaluate(
    `chrome.storage.local.set({ ${JSON.stringify(SETTINGS_KEY)}: ${JSON.stringify(settings)} }).then(() => true)`,
  );

// Duplicate tabs of the same site make a URL-pattern query ambiguous, so the
// tab under test is brought to the front and addressed as the active tab.
await page.send('Page.bringToFront').catch(() => {});
const ACTIVE_TAB = "chrome.tabs.query({ active: true, lastFocusedWindow: true })";

/** Puts the tab into an active, saveable capture. */
const seedCapture = () =>
  sw.evaluate(`(async () => {
    await chrome.storage.session.clear();
    const [tab] = await ${ACTIVE_TAB};
    const key = 'crm-capture-session-' + tab.id;
    const session = {
      active: true, source: ${/instagram/.test(live.url) ? "'Instagram'" : "'WhatsApp'"}, startedAt: new Date().toISOString(),
      name: 'John Fernando', number: '+94 77 123 4567',
    };
    await chrome.storage.session.set({ [key]: session });
    await chrome.tabs.sendMessage(tab.id, { type: 'CRM_STATE', session });
    return true;
  })()`);

const sessionCount = () =>
  sw.evaluate(`chrome.storage.session.get(null).then(o => Object.keys(o).length)`);

await sw.evaluate(`chrome.storage.session.clear().then(() => true)`).catch(() => {});

// --- 1. Options page renders and persists settings ------------------------
const browserVersion = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json());
const browser = await connect(browserVersion.webSocketDebuggerUrl);
await browser.send('Target.createTarget', { url: `chrome-extension://${EXT_ID}/options.html` });
browser.close();
await sleep(2500);

const optionsTarget = (await list()).find((t) => (t.url ?? '').endsWith('/options.html'));
check('options page opens', Boolean(optionsTarget), optionsTarget?.url ?? 'not found');

if (optionsTarget) {
  const options = await connect(optionsTarget.webSocketDebuggerUrl);
  const form = await options.evaluate(`(() => {
    const ids = ['url','secret','device','txt','save','test','status'];
    const missing = ids.filter(i => !document.getElementById(i));
    return { title: document.title, missing, txtDefault: document.getElementById('txt').checked };
  })()`);
  check('all settings controls present', form.missing.length === 0, form.missing.join(', ') || 'ok');
  check('TXT copy defaults to off (sheet-only)', form.txtDefault === false, `checked=${form.txtDefault}`);

  // Round-trip a value through the real save handler.
  await options.evaluate(`(() => {
    document.getElementById('url').value = 'https://script.google.com/macros/s/TESTFAKE/exec';
    document.getElementById('secret').value = 's3cret';
    document.getElementById('device').value = 'Test PC';
    document.getElementById('save').click();
    return true;
  })()`);
  await sleep(900);
  const saved = await sw.evaluate(
    `chrome.storage.local.get(${JSON.stringify(SETTINGS_KEY)}).then(o => o[${JSON.stringify(SETTINGS_KEY)}] || null)`,
  );
  check('settings persist via the options page', saved?.deviceLabel === 'Test PC', JSON.stringify(saved));

  // A non-Apps-Script URL must be rejected by the form.
  await options.evaluate(`(() => {
    document.getElementById('url').value = 'https://example.com/hook';
    document.getElementById('save').click();
    return true;
  })()`);
  await sleep(600);
  const rejected = await options.evaluate(`document.getElementById('status').textContent`);
  check('bad URL rejected', /does not look like/i.test(rejected), JSON.stringify(rejected));
  options.close();
}

// --- 2. STOP with nothing configured --------------------------------------
await setSettings({ webAppUrl: '', sharedSecret: '', deviceLabel: '', alsoSaveTxt: false });
await seedCapture();
await sleep(500);
let ui = await readToolbar();
check('capture seeded and saveable', ui.button === 'STOP' && ui.disabled === false, ui.button);

await clickButton();
await sleep(2500);
ui = await readToolbar();
check(
  'unconfigured STOP explains what to do',
  /options/i.test(ui.status),
  JSON.stringify(ui.status),
);
check('capture NOT discarded', ui.button === 'STOP' && ui.fields[1].includes('✓'), ui.fields[1]);
check('session still in storage', (await sessionCount()) === 1, `${await sessionCount()} keys`);

// --- 3. STOP with an unreachable endpoint ---------------------------------
await setSettings({
  webAppUrl: 'https://script.google.com/macros/s/TESTFAKE/exec',
  sharedSecret: 's3cret',
  deviceLabel: 'Test PC',
  alsoSaveTxt: false,
});
await clickButton();
await sleep(12000);
ui = await readToolbar();
check('failed push surfaces an error', ui.status.length > 0 && !/^✓/.test(ui.status), JSON.stringify(ui.status));
check('capture STILL not discarded', ui.button === 'STOP' && ui.fields[1].includes('✓'), ui.fields[1]);
check('STOP remains available to retry', ui.disabled === false, `disabled=${ui.disabled}`);
check('session survived the failure', (await sessionCount()) === 1, `${await sessionCount()} keys`);

// --- cleanup ---------------------------------------------------------------
await sw.evaluate(`chrome.storage.session.clear().then(() => true)`).catch(() => {});
await setSettings({ webAppUrl: '', sharedSecret: '', deviceLabel: '', alsoSaveTxt: false });
page.close();
sw.close();

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} sheet-path checks passed`);
process.exit(failed ? 1 : 0);
