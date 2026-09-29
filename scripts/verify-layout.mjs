// Checks the toolbar does not cover or clip the host page. Run with the
// browser open ("npm start"); pass a URL to check that page instead.
const PORT = Number(process.env.CRM_CAPTURE_DEBUG_PORT ?? 9222);
const H = 48;

const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const pages = targets.filter(
  (t) => t.type === 'page' && /web\.whatsapp\.com|instagram\.com/.test(t.url ?? ''),
);
if (!pages.length) {
  console.error('[layout] No WhatsApp/Instagram page open. Run "npm start" first.');
  process.exit(1);
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let id = 0;
  const evaluate = (expression) =>
    new Promise((res, rej) => {
      const my = ++id;
      const on = (e) => {
        const m = JSON.parse(e.data);
        if (m.id !== my) return;
        ws.removeEventListener('message', on);
        if (m.error) return rej(new Error(m.error.message));
        const r = m.result?.result;
        if (r?.subtype === 'error') return rej(new Error(r.description));
        res(r?.value);
      };
      ws.addEventListener('message', on);
      ws.send(
        JSON.stringify({
          id: my,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true, awaitPromise: true },
        }),
      );
    });
  return { evaluate, close: () => ws.close() };
}

let failures = 0;

for (const target of pages) {
  const page = await connect(target.webSocketDebuggerUrl);
  const r = await page.evaluate(`(() => {
    const H = ${H};
    const host = document.getElementById('crm-capture-toolbar-host');
    // Sample the page's own top-level content boxes, ignoring our toolbar.
    const boxes = [...document.body.children]
      .filter(el => el.id !== 'crm-capture-toolbar-host')
      .map(el => {
        const b = el.getBoundingClientRect();
        return { tag: el.tagName + (el.id ? '#' + el.id : ''), top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) };
      })
      .filter(b => b.h > 20);
    const underToolbar = boxes.filter(b => b.top < H - 1);
    const scrollable = document.scrollingElement;
    return {
      toolbarPresent: Boolean(host),
      viewport: window.innerHeight,
      boxes,
      underToolbar,
      overflowBottom: boxes.filter(b => b.bottom > window.innerHeight + 2),
      canScroll: scrollable ? scrollable.scrollHeight > scrollable.clientHeight : false,
      scrollHeight: scrollable ? scrollable.scrollHeight : 0,
      clientHeight: scrollable ? scrollable.clientHeight : 0,
    };
  })()`);

  const site = /whatsapp/.test(target.url) ? 'WhatsApp' : 'Instagram';
  console.log(`\n=== ${site} — ${target.url}`);
  console.log(`  viewport ${r.viewport}px, top-level boxes:`);
  for (const b of r.boxes) console.log(`    ${b.tag.padEnd(22)} top=${b.top} bottom=${b.bottom} h=${b.h}`);

  // On a scrolling page (Instagram) content below the fold is normal and
  // reachable, so bottom overflow only matters for a fixed app shell that
  // cannot scroll (WhatsApp).
  const clipped = r.canScroll ? [] : r.overflowBottom;
  const checks = [
    ['toolbar injected', r.toolbarPresent],
    ['nothing under the toolbar', r.underToolbar.length === 0, JSON.stringify(r.underToolbar)],
    [
      r.canScroll ? 'bottom overflow scrollable (ok)' : 'nothing clipped off the bottom',
      clipped.length === 0,
      JSON.stringify(clipped),
    ],
  ];
  for (const [label, ok, detail = ''] of checks) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} ${ok ? '' : detail}`);
    if (!ok) failures += 1;
  }
  console.log(`  info  scrollHeight=${r.scrollHeight} clientHeight=${r.clientHeight} canScroll=${r.canScroll}`);
  page.close();
}

console.log(failures ? `\n${failures} layout check(s) failed` : '\nAll layout checks passed');
process.exit(failures ? 1 : 0);
