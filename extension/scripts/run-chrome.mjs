// Launches Google Chrome for Testing with the extension loaded, then confirms
// the MV3 service worker actually registered.
//
// Chrome for Testing is an unmanaged developer build: it reads no corporate
// policy key and uses its own profile, so it neither depends on nor alters the
// managed Chrome install. Nothing here modifies any policy.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const BROWSER_DIR = resolve(ROOT, '.browser');
const PROFILE = resolve(BROWSER_DIR, 'profile');
const PORT = Number(process.env.CRM_CAPTURE_DEBUG_PORT ?? 9222);

const START_URL = process.argv[2] ?? 'https://web.whatsapp.com/';

function fail(message) {
  console.error(`[run] ${message}`);
  process.exit(1);
}

/** Finds the Chrome for Testing binary downloaded by @puppeteer/browsers. */
function findChrome() {
  const root = resolve(BROWSER_DIR, 'chrome');
  if (!existsSync(root)) return null;
  for (const dir of readdirSync(root)) {
    for (const inner of ['chrome-win64', 'chrome-win32', 'chrome-linux64']) {
      const exe = resolve(root, dir, inner, process.platform === 'win32' ? 'chrome.exe' : 'chrome');
      if (existsSync(exe)) return exe;
    }
    const mac = resolve(
      root,
      dir,
      'chrome-mac-x64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    );
    if (existsSync(mac)) return mac;
  }
  return null;
}

/** Derives the extension ID from the signing key, the same way Chrome does. */
function extensionId() {
  const keyFile = resolve(ROOT, 'key.pem');
  if (!existsSync(keyFile)) return null;
  const spki = createPublicKey(createPrivateKey(readFileSync(keyFile, 'utf8'))).export({
    type: 'spki',
    format: 'der',
  });
  return [...createHash('sha256').update(spki).digest().subarray(0, 16)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/[0-9a-f]/g, (c) => 'abcdefghijklmnop'[parseInt(c, 16)]);
}

const chrome = findChrome();
if (!chrome) {
  fail(
    'Chrome for Testing not found. Install it with:\n' +
      '      npx @puppeteer/browsers install chrome@stable --path .browser',
  );
}
if (!existsSync(resolve(DIST, 'manifest.json'))) {
  fail('dist/ is missing or incomplete - run "npm run build" first.');
}

mkdirSync(PROFILE, { recursive: true });

const args = [
  `--user-data-dir=${PROFILE}`,
  `--load-extension=${DIST}`,
  `--disable-extensions-except=${DIST}`,
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-search-engine-choice-screen',
  START_URL,
];

console.log(`[run] ${chrome}`);
console.log(`[run] profile: ${PROFILE}`);
console.log(`[run] extension: ${DIST}\n`);

const child = spawn(chrome, args, { detached: true, stdio: 'ignore' });
child.unref();

/** Polls the DevTools endpoint until the extension's service worker appears. */
async function verify() {
  const id = extensionId();
  const deadline = Date.now() + 45_000;
  let sawBrowser = false;

  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      sawBrowser = true;
      // Match our own extension only - Chrome ships built-in component
      // extensions whose workers also show up here.
      const worker = targets.find(
        (t) =>
          typeof t.url === 'string' &&
          t.url.startsWith('chrome-extension://') &&
          (id ? t.url.includes(id) : t.url.endsWith('/background.js')),
      );
      if (worker) {
        const loadedId = new URL(worker.url).hostname;
        console.log(`[run] extension service worker is running`);
        console.log(`[run]   ${worker.url}`);
        console.log(`[run]   loaded ID : ${loadedId}`);
        if (id) {
          console.log(`[run]   expected  : ${id}`);
          console.log(`[run]   ID match  : ${loadedId === id}`);
        }
        return true;
      }
    } catch {
      // DevTools endpoint is not up yet.
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.warn(
    sawBrowser
      ? '[run] Chrome started but no extension worker appeared within 45s.\n' +
          '[run] The worker sleeps when idle - check chrome://extensions in the window.'
      : '[run] Could not reach the DevTools endpoint; Chrome may still be starting.',
  );
  return false;
}

await verify();
console.log('\n[run] Chrome for Testing is open. Leave it running while you test.');
