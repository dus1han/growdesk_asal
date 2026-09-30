// Builds release/crm-capture-<version>.zip - a self-contained package to copy
// to another PC. Needs no Node, npm or build step on the target machine.
//
// Layout inside the zip:
//   CRM-Capture/INSTALL.md        plain install steps
//   CRM-Capture/extension/        the folder to pick in "Load unpacked"
//   CRM-Capture/managed-chrome/   only needed if that PC blocks extensions
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZip } from './zip.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const DEPLOY = resolve(ROOT, 'deploy');
const RELEASE = resolve(ROOT, 'release');

const { version } = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(DIST, 'manifest.json'), 'utf8'));
const CRX_NAME = `crm-capture-${version}.crx`;
const TOP = 'CRM-Capture';

function fail(message) {
  console.error(`[release] ${message}`);
  process.exit(1);
}

if (!existsSync(resolve(DIST, 'manifest.json'))) fail('dist/ missing - run "npm run build".');
if (manifest.version !== version) {
  fail(`version mismatch: package.json ${version} vs manifest ${manifest.version}`);
}

/** Collects every file under dir as {name, data} entries rooted at prefix. */
function collect(dir, prefix) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...collect(full, `${prefix}/${name}`));
    else out.push({ name: `${prefix}/${relative(dir, full).replace(/\\/g, '/')}`, data: readFileSync(full) });
  }
  return out;
}

const INSTALL = `# CRM Capture — install on another PC

Prototype Chrome extension. Captures Name / Number / Instagram Name from text
you highlight on WhatsApp Web and Instagram, and saves a local .txt file.
It sends no data anywhere.

Nothing needs to be installed or built — the extension is ready to load.

## Install (about 1 minute)

1. Unzip this folder somewhere permanent, for example
   \`C:\\Users\\<you>\\Documents\\CRM-Capture\`.

   **Do not delete or move the folder afterwards.** Chrome loads the extension
   from this location every time it starts. If the folder disappears, the
   extension disappears with it.

2. Open Chrome and go to:  \`chrome://extensions\`

3. Turn on **Developer mode** (toggle, top right).

4. Click **Load unpacked**.

5. Select the **\`extension\`** folder inside this package — the one containing
   \`manifest.json\`. Do not select the outer \`CRM-Capture\` folder.

6. Open \`https://web.whatsapp.com/\` or \`https://www.instagram.com/\` and
   **reload the tab**. A slim toolbar appears at the top of the page.

Chrome will show a "Disable developer mode extensions" notice each time it
starts. That is normal for an unpacked extension and can be dismissed.

## How to use it

1. Press **START** in the toolbar.
2. Highlight some text on the page.
3. Right-click it → **CRM Capture** → *Set as Name* / *Set as Number* /
   *Set as Insta Name*.
4. The matching tick turns green.
5. Press **STOP** to save. A file named \`lead-YYYY-MM-DD-HH-mm-ss.txt\` is
   downloaded and the toolbar resets.

**STOP only works once a Number or an Insta Name has been captured.** A Name on
its own is not enough — that is deliberate. The toolbar tells you what is
missing.

Example output:

\`\`\`
Name: John Fernando
Number: +94 77 123 4567
Instagram Name: @johnfernando
Source: WhatsApp
Captured At: 2026-09-16 10:07:17
\`\`\`

Missing fields are written as \`Not captured\`.

## If "Load unpacked" is greyed out, or Chrome says the extension is blocked

That PC is managed by an IT policy that blocks extensions. Developer mode will
not get around it, and neither will the \`.crx\` file — Chrome refuses any
extension whose ID is not in policy, however it is delivered.

Deployment then has to go through IT. Everything they need is in the
\`managed-chrome\` folder — start with \`managed-chrome/README-IT.md\`.

Extension ID: \`${manifest.key ? 'mnhjjndckpjiglmdlpelboiebdjcfaid' : '(unsigned build)'}\`

## What it can access

- Runs only on \`web.whatsapp.com\` and \`www.instagram.com\`.
- Reads only text you highlight and explicitly assign via the right-click menu.
  It does not read conversations, contacts, or page content.
- Makes no network requests of any kind. No CRM, no Zoho, no API, no login.
- Captures are held in memory only and cleared when the browser closes. The
  .txt file is the only output.

Version ${version}.
`;

const entries = [
  { name: `${TOP}/INSTALL.md`, data: Buffer.from(INSTALL, 'utf8') },
  ...collect(DIST, `${TOP}/extension`),
];

// The managed-Chrome material is optional - include it when deploy/ exists.
if (existsSync(DEPLOY)) {
  for (const name of readdirSync(DEPLOY)) {
    const full = join(DEPLOY, name);
    if (statSync(full).isFile()) {
      entries.push({ name: `${TOP}/managed-chrome/${name}`, data: readFileSync(full) });
    }
  }
} else {
  console.warn('[release] deploy/ not found - packaging without managed-Chrome material.');
}

const { buffer, sha256, count } = createZip(entries);

rmSync(RELEASE, { recursive: true, force: true });
mkdirSync(RELEASE, { recursive: true });
const zipPath = resolve(RELEASE, `crm-capture-${version}.zip`);
writeFileSync(zipPath, buffer);
writeFileSync(resolve(RELEASE, `crm-capture-${version}.zip.sha256`), `${sha256}  crm-capture-${version}.zip\n`);

console.log(`[release] ${zipPath}`);
console.log(`[release] ${count} files, ${(buffer.length / 1024).toFixed(1)} KB`);
console.log(`[release] sha256 ${sha256}`);
console.log(`\n  Copy that .zip to the other PC and follow INSTALL.md inside it.`);
if (!existsSync(resolve(DEPLOY, CRX_NAME))) {
  console.log('  (Run "npm run deploy" first if you also want the signed .crx included.)');
}
