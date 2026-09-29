// Packs dist/ into a signed .crx3 using the locally installed Chrome, and
// emits the update.xml an admin needs for policy-based deployment.
//
// Note: a .crx does not bypass ExtensionInstallBlocklist. This produces the
// artifact an administrator deploys once the extension ID is allowlisted.
import { spawnSync } from 'node:child_process';
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const KEY = resolve(ROOT, 'key.pem');

const { version } = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const OUT = resolve(ROOT, `crm-capture-${version}.crx`);

// Where the .crx will be hosted for ExtensionInstallForcelist deployment.
// Must be HTTPS and reachable by every managed machine.
const HOSTING_URL =
  process.env.CRM_CAPTURE_HOSTING_URL ?? 'https://REPLACE-ME.example.com/crm-capture';

const CHROME_CANDIDATES = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

function fail(message) {
  console.error(`[pack] ${message}`);
  process.exit(1);
}

if (!existsSync(DIST)) fail('dist/ is missing - run "npm run build" first.');
if (!existsSync(KEY)) fail('key.pem is missing - run "node scripts/make-key.mjs" first.');

const chrome = CHROME_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
if (!chrome) fail('Could not find a Chrome executable to pack with.');

rmSync(`${DIST}.crx`, { force: true });
rmSync(OUT, { force: true });

const result = spawnSync(
  chrome,
  [`--pack-extension=${DIST}`, `--pack-extension-key=${KEY}`, '--no-message-box'],
  { stdio: 'inherit' },
);
if (result.error) fail(`Chrome failed to launch: ${result.error.message}`);
if (!existsSync(`${DIST}.crx`)) fail('Chrome did not produce a .crx.');
renameSync(`${DIST}.crx`, OUT);

// Derive the extension ID from the signing key, the same way Chrome does.
const spki = createPublicKey(createPrivateKey(readFileSync(KEY, 'utf8'))).export({
  type: 'spki',
  format: 'der',
});
const id = [...createHash('sha256').update(spki).digest().subarray(0, 16)]
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')
  .replace(/[0-9a-f]/g, (c) => 'abcdefghijklmnop'[parseInt(c, 16)]);

const crx = readFileSync(OUT);
if (crx.subarray(0, 4).toString('ascii') !== 'Cr24') fail('Output is not a valid CRX.');
const headerSize = crx.readUInt32LE(8);
if (!crx.subarray(12, 12 + headerSize).includes(spki)) {
  fail('CRX was not signed with key.pem.');
}

writeFileSync(
  resolve(ROOT, 'update.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="${id}">
    <updatecheck codebase="${HOSTING_URL}/crm-capture-${version}.crx" version="${version}" />
  </app>
</gupdate>
`,
);

console.log(`\n[pack] ${OUT}  (${crx.length} bytes, CRX3, signed)`);
console.log('[pack] update.xml written');
console.log(`[pack] Extension ID: ${id}\n`);
