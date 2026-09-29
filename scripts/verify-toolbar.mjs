// End-to-end check: connects to the running Chrome for Testing instance over
// the DevTools protocol and inspects the toolbar the content script injected
// into the live page. Requires "npm start" to be running.
const PORT = Number(process.env.CRM_CAPTURE_DEBUG_PORT ?? 9222);
const HOST_ID = 'crm-capture-toolbar-host';

const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const page = targets.find(
  (t) => t.type === 'page' && /web\.whatsapp\.com|instagram\.com/.test(t.url ?? ''),
);
if (!page) {
  console.error('[ui] No WhatsApp/Instagram page open. Run "npm start" first.');
  process.exit(1);
}
console.log(`[ui] inspecting ${page.url}\n`);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

let nextId = 0;
const evaluate = (expression) =>
  new Promise((res, rej) => {
    const id = ++nextId;
    const onMessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMessage);
      if (msg.error) return rej(new Error(msg.error.message));
      const result = msg.result?.result;
      if (result?.subtype === 'error') return rej(new Error(result.description));
      res(result?.value);
    };
    ws.addEventListener('message', onMessage);
    ws.send(
      JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }),
    );
  });

const report = await evaluate(`(() => {
  const hosts = document.querySelectorAll('#${HOST_ID}');
  const host = hosts[0];
  if (!host) return { mounted: false };
  const bar = host.shadowRoot && host.shadowRoot.querySelector('.crm-bar');
  const btn = bar && bar.querySelector('.crm-btn');
  const marks = bar ? [...bar.querySelectorAll('.crm-field')].map(f => f.textContent.trim()) : [];
  return {
    mounted: true,
    hostCount: hosts.length,
    shadowRoot: Boolean(host.shadowRoot),
    shadowMode: host.shadowRoot ? host.shadowRoot.mode : null,
    height: Math.round(host.getBoundingClientRect().height),
    top: Math.round(host.getBoundingClientRect().top),
    zIndex: getComputedStyle(host).zIndex,
    pageOffset: getComputedStyle(document.documentElement).marginTop,
    offsetClass: document.documentElement.classList.contains('crm-capture-offset'),
    brand: bar ? bar.querySelector('.crm-brand').textContent : null,
    chip: bar ? bar.querySelector('.crm-chip').textContent.trim() : null,
    fields: marks,
    button: btn ? btn.textContent.trim() : null,
    buttonDisabled: btn ? btn.disabled : null,
  };
})()`);

if (!report.mounted) {
  console.error('[ui] FAIL - toolbar host not found in the page.');
  process.exit(1);
}

const expect = (label, actual, wanted) => {
  const ok = typeof wanted === 'function' ? wanted(actual) : actual === wanted;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} ${JSON.stringify(actual)}`);
  return ok;
};

const checks = [
  expect('exactly one toolbar', report.hostCount, 1),
  expect('shadow root attached', report.shadowRoot, true),
  expect('shadow mode open', report.shadowMode, 'open'),
  expect('height 44-48px', report.height, (h) => h >= 44 && h <= 48),
  expect('pinned to top', report.top, 0),
  expect('max z-index', report.zIndex, '2147483647'),
  expect('page pushed down', report.pageOffset, '48px'),
  expect('offset class applied', report.offsetClass, true),
  expect('brand label', report.brand, 'CRM Capture'),
  expect('platform chip', report.chip, (c) => c === 'WhatsApp' || c === 'Instagram'),
  expect('three field ticks', report.fields.length, 3),
  expect('all ticks empty', report.fields, (f) => f.every((x) => x.includes('\u25CB'))),
  expect('button is START', report.button, 'START'),
];

ws.close();
const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} UI checks passed`);
process.exit(failed ? 1 : 0);
