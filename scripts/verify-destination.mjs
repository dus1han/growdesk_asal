// Live checks for the CRM destination: the options page renders and validates,
// and a failed send never discards a capture.
//
// The actual POST needs a real endpoint - configure one in the options page
// and use "Test connection". Everything up to the network call is covered here
// and in scripts/verify-logic.mjs.
//
// Requires the browser running with the extension loaded.
const PORT = Number(process.env.CRM_CAPTURE_DEBUG_PORT ?? 9222);
const EXT_ID = 'mnhjjndckpjiglmdlpelboiebdjcfaid';
const SETTINGS_KEY = 'crm-capture-settings';

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
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

const SITE = /web\.whatsapp\.com|instagram\.com/;

// Run this against a freshly launched browser with a single site tab.
// Closing duplicate targets from here proved unreliable, so the suite asserts
// the precondition instead of trying to fix it.
const browserWs = (await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()))
  .webSocketDebuggerUrl;
const browser = await connect(browserWs);
const siteTabs = (await list()).filter((t) => t.type === 'page' && SITE.test(t.url ?? ''));
if (siteTabs.length > 1) {
  console.error(
    `[dest] ${siteTabs.length} WhatsApp/Instagram tabs are open; this suite needs exactly one.`,
  );
  process.exit(1);
}

let pageTarget = (await list()).find((t) => t.type === 'page' && SITE.test(t.url ?? ''));
if (!pageTarget) {
  console.error('[dest] No WhatsApp/Instagram page open.');
  process.exit(1);
}

async function findWorker() {
  for (let i = 0; i < 3; i += 1) {
    const found = (await list()).find((t) => (t.url ?? '').includes(EXT_ID));
    if (found) return found;
    const waker = await connect(pageTarget.webSocketDebuggerUrl);
    await waker.evaluate('location.reload(), true').catch(() => {});
    waker.close();
    await sleep(6000);
    pageTarget = (await list()).find((t) => t.type === 'page' && SITE.test(t.url ?? ''));
  }
  return null;
}

const swTarget = await findWorker();
if (!swTarget) {
  console.error('[dest] Extension service worker not found.');
  process.exit(1);
}

const page = await connect(pageTarget.webSocketDebuggerUrl);
const sw = await connect(swTarget.webSocketDebuggerUrl);
await page.send('Page.bringToFront').catch(() => {});

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

const seedCapture = () =>
  sw.evaluate(`(async () => {
    await chrome.storage.session.clear();
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const key = 'crm-capture-session-' + tab.id;
    const session = {
      active: true, source: 'WhatsApp', startedAt: new Date().toISOString(),
      name: 'John Fernando', number: '+94 77 123 4567',
    };
    await chrome.storage.session.set({ [key]: session });
    await chrome.tabs.sendMessage(tab.id, { type: 'CRM_STATE', session });
    return tab.id;
  })()`);

const sessionCount = () =>
  sw.evaluate(`chrome.storage.session.get(null).then(o => Object.keys(o).length)`);

const setSettings = (s) =>
  sw.evaluate(
    `chrome.storage.local.set({ ${JSON.stringify(SETTINGS_KEY)}: ${JSON.stringify(s)} }).then(() => true)`,
  );

const BLANK = {
  destinationId: 'webhook',
  endpointUrl: '',
  authHeaderName: 'Authorization',
  authToken: '',
  deviceLabel: '',
  alsoSaveTxt: false,
};

// --- 1. Options page -------------------------------------------------------
await browser.send('Target.createTarget', { url: `chrome-extension://${EXT_ID}/options.html` });
await sleep(2500);
const optionsTarget = (await list()).find((t) => (t.url ?? '').endsWith('/options.html'));
check('options page opens', Boolean(optionsTarget));

if (optionsTarget) {
  const options = await connect(optionsTarget.webSocketDebuggerUrl);

  const shape = await options.evaluate(`(() => {
    const missing = ['destination','endpoint','header','token','device','txt','save','test','status','sample']
      .filter(i => !document.getElementById(i));
    return {
      missing,
      destinations: [...document.getElementById('destination').options].map(o => o.value),
      defaultHeader: document.getElementById('header').value,
      txtDefault: document.getElementById('txt').checked,
      sample: document.getElementById('sample').textContent,
    };
  })()`);
  check('all controls present', shape.missing.length === 0, shape.missing.join(', ') || 'ok');
  check('destination picker populated', shape.destinations.includes('webhook'), shape.destinations.join(', '));
  check('default credential header suggested', shape.defaultHeader === 'Authorization', shape.defaultHeader);
  check('TXT copy defaults to off', shape.txtDefault === false, `checked=${shape.txtDefault}`);
  check('sample shows a POST with the lead body', /^POST https:\/\//.test(shape.sample) && shape.sample.includes('"number"'), shape.sample.split('\n')[0]);

  // Validation must reject plain http before any permission prompt appears.
  const httpError = await options.evaluate(`(() => {
    document.getElementById('endpoint').value = 'http://crm.example.com/leads';
    document.getElementById('save').click();
    return document.getElementById('status').textContent;
  })()`);
  check('http endpoint rejected', /must use https/i.test(httpError), JSON.stringify(httpError));

  const junkError = await options.evaluate(`(() => {
    document.getElementById('endpoint').value = 'nonsense';
    document.getElementById('save').click();
    return document.getElementById('status').textContent;
  })()`);
  check('invalid URL rejected', /not a valid url/i.test(junkError), JSON.stringify(junkError));

  const tokenError = await options.evaluate(`(() => {
    document.getElementById('endpoint').value = 'https://crm.example.com/leads';
    document.getElementById('header').value = '';
    document.getElementById('token').value = 'abc123';
    document.getElementById('save').click();
    return document.getElementById('status').textContent;
  })()`);
  check('token without header rejected', /header name/i.test(tokenError), JSON.stringify(tokenError));

  options.close();
}

// --- 2. STOP with nothing configured --------------------------------------
await setSettings(BLANK);
await page.send('Page.bringToFront').catch(() => {});
await seedCapture();
await sleep(600);
let ui = await readToolbar();
check('capture seeded and saveable', ui.button === 'STOP' && ui.disabled === false, `${ui.button} disabled=${ui.disabled}`);

await clickButton();
await sleep(2500);
ui = await readToolbar();
check('unconfigured STOP names the fix', /options/i.test(ui.status), JSON.stringify(ui.status));
check('error persists (does not fade)', ui.status.length > 0, 'still shown after 2.5s');
check('capture NOT discarded', ui.fields[1].includes('✓'), ui.fields[1]);
check('session still stored', (await sessionCount()) === 1, `${await sessionCount()} keys`);

// --- 3. STOP with an endpoint whose origin was never granted --------------
await setSettings({ ...BLANK, endpointUrl: 'https://crm.example.com/api/leads', authToken: 'x', authHeaderName: 'X-API-Key' });
await clickButton();
await sleep(3000);
ui = await readToolbar();
check('ungranted origin is refused before any request', /granted|permission/i.test(ui.status), JSON.stringify(ui.status));
check('capture STILL not discarded', ui.fields[1].includes('✓'), ui.fields[1]);
check('STOP remains available to retry', ui.disabled === false, `disabled=${ui.disabled}`);
check('session survived', (await sessionCount()) === 1, `${await sessionCount()} keys`);

// --- cleanup ---------------------------------------------------------------
await sw.evaluate(`chrome.storage.session.clear().then(() => true)`).catch(() => {});
await setSettings(BLANK);
page.close();
sw.close();
browser.close();

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} destination checks passed`);
process.exit(failed ? 1 : 0);
