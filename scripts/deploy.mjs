// Produces deploy/ - everything IT needs for Option B (force-install from
// internal HTTPS hosting): the signed .crx, the update manifest, web-server
// MIME configuration, a policy .reg for a single test machine, and the
// step-by-step IT runbook.
//
// Usage:
//   node scripts/deploy.mjs https://intranet.example.com/chrome/crm-capture
//   CRM_CAPTURE_HOSTING_URL=https://... node scripts/deploy.mjs
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEPLOY = resolve(ROOT, 'deploy');
const KEY = resolve(ROOT, 'key.pem');

const { version } = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const CRX_NAME = `crm-capture-${version}.crx`;
const CRX = resolve(ROOT, CRX_NAME);

/** Index to use in the ExtensionInstallForcelist registry key. */
const FORCELIST_INDEX = process.env.CRM_CAPTURE_FORCELIST_INDEX ?? '2';

const PLACEHOLDER = 'https://REPLACE-ME.example.com/chrome/crm-capture';

function fail(message) {
  console.error(`[deploy] ${message}`);
  process.exit(1);
}

const rawUrl = process.argv[2] ?? process.env.CRM_CAPTURE_HOSTING_URL ?? PLACEHOLDER;
const baseUrl = rawUrl.replace(/\/+$/, '');
const isPlaceholder = baseUrl === PLACEHOLDER;

if (!isPlaceholder) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    fail(`"${rawUrl}" is not a valid URL.`);
  }
  // Chrome treats localhost / 127.0.0.1 as trustworthy origins, so plain HTTP
  // is accepted there. Every other host must be HTTPS.
  const isLoopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
    fail(
      'Chrome refuses non-HTTPS update URLs for force-installed extensions. ' +
        'Use https://, or http://localhost for single-machine testing.',
    );
  }
  if (isLoopback) {
    console.log('[deploy] loopback host - single-machine testing only.');
    console.log('[deploy] Each machine would need its own local server; not usable for a fleet.');
  }
}

if (!existsSync(CRX)) fail(`${CRX_NAME} is missing - run "npm run pack" first.`);
if (!existsSync(KEY)) fail('key.pem is missing - run "npm run key" first.');

// Derive the extension ID from the signing key, exactly as Chrome does.
const spki = createPublicKey(createPrivateKey(readFileSync(KEY, 'utf8'))).export({
  type: 'spki',
  format: 'der',
});
const id = [...createHash('sha256').update(spki).digest().subarray(0, 16)]
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')
  .replace(/[0-9a-f]/g, (c) => 'abcdefghijklmnop'[parseInt(c, 16)]);

// Confirm the .crx on disk was signed with this key before shipping it.
const crx = readFileSync(CRX);
if (crx.subarray(0, 4).toString('ascii') !== 'Cr24' || crx.readUInt32LE(4) !== 3) {
  fail('Packaged file is not a CRX3 archive.');
}
if (!crx.subarray(12, 12 + crx.readUInt32LE(8)).includes(spki)) {
  fail('The .crx was not signed with key.pem - re-run "npm run pack".');
}

const updateUrl = `${baseUrl}/update.xml`;
const crxUrl = `${baseUrl}/${CRX_NAME}`;
const forcelistValue = `${id};${updateUrl}`;

rmSync(DEPLOY, { recursive: true, force: true });
mkdirSync(DEPLOY, { recursive: true });
copyFileSync(CRX, resolve(DEPLOY, CRX_NAME));

const write = (name, contents) => writeFileSync(resolve(DEPLOY, name), contents);

write(
  'update.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="${id}">
    <updatecheck codebase="${crxUrl}" version="${version}" />
  </app>
</gupdate>
`,
);

// IIS refuses to serve extensions it has no MIME mapping for, returning 404.
write(
  'web.config',
  `<?xml version="1.0" encoding="UTF-8"?>
<!-- Place in the folder serving the .crx if hosting on IIS. -->
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".crx" />
      <mimeMap fileExtension=".crx" mimeType="application/x-chrome-extension" />
      <remove fileExtension=".xml" />
      <mimeMap fileExtension=".xml" mimeType="text/xml" />
    </staticContent>
  </system.webServer>
</configuration>
`,
);

write(
  '.htaccess',
  `# Place in the folder serving the .crx if hosting on Apache.
AddType application/x-chrome-extension .crx
AddType text/xml .xml
`,
);

write(
  'nginx.conf.snippet',
  `# Add to the server/location block serving the .crx if hosting on nginx.
location /chrome/crm-capture/ {
    types { }
    default_type application/octet-stream;

    location ~ \\.crx$  { add_header Content-Type application/x-chrome-extension; }
    location ~ \\.xml$  { add_header Content-Type text/xml; }
}
`,
);

// Single-machine test only. Fleet rollout should use Group Policy.
write(
  'crm-capture-forcelist.reg',
  `Windows Registry Editor Version 5.00

; CRM Capture (Prototype) - force install from internal hosting.
; TEST MACHINE ONLY. Use Group Policy for fleet rollout.
; Requires administrator rights. Verify index "${FORCELIST_INDEX}" is unused first:
;   reg query "HKLM\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist"

[HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist]
"${FORCELIST_INDEX}"="${forcelistValue}"
`,
);

write(
  'README-IT.md',
  `# CRM Capture — Option B force-install runbook

**Written for: the Chrome browser administrator.**

| Item | Value |
| --- | --- |
| Extension ID | \`${id}\` |
| Version | ${version} |
| Package | \`${CRX_NAME}\` (CRX3, signed, ${crx.length} bytes) |
| Update manifest URL | \`${updateUrl}\` |
| Package URL | \`${crxUrl}\` |

${
  isPlaceholder
    ? '> **The hosting URL is still a placeholder.** Re-run\n> `node scripts/deploy.mjs https://your-real-host/path` to stamp the real URL\n> into `update.xml` and the `.reg` file before deploying.\n'
    : ''
}
Force-installed extensions are **exempt from \`ExtensionInstallBlocklist\`**, so
no allowlist entry is required. See \`../DEPLOYMENT.md\` for what the extension
does and its security profile.

## 1. Host the files

Upload to a folder served over HTTPS at \`${baseUrl}/\`:

- \`${CRX_NAME}\`
- \`update.xml\`

Requirements:

- **HTTPS with a certificate trusted by managed machines.** Chrome refuses
  plain HTTP update URLs for force-installed extensions.
- **Anonymous read access.** Chrome fetches the update manifest from the
  browser process without user credentials. Anything requiring an interactive
  sign-in will fail — this rules out SharePoint and OneDrive.
- **Correct MIME types.** Apply the matching config from this folder:
  \`web.config\` (IIS), \`.htaccess\` (Apache), or \`nginx.conf.snippet\` (nginx).
  IIS in particular returns 404 for \`.crx\` until the MIME mapping is added.

Azure Blob Storage static website hosting and any plain internal IIS/nginx site
work well.

## 2. Verify hosting before touching policy

\`\`\`powershell
# Should return the XML, status 200
Invoke-WebRequest -Uri "${updateUrl}" -UseBasicParsing | Select-Object StatusCode, Content

# Should return status 200 and a non-zero length
(Invoke-WebRequest -Uri "${crxUrl}" -UseBasicParsing) |
  Select-Object StatusCode, @{n='Type';e={$_.Headers.'Content-Type'}}, @{n='Bytes';e={$_.RawContentLength}}
\`\`\`

Run this from a managed machine, not the web server.

## 3. Apply the policy

### Group Policy (fleet rollout — preferred)

*Computer Configuration → Administrative Templates → Google → Google Chrome →
Extensions → **Configure the list of force-installed apps and extensions***

Enable it and add this single value:

\`\`\`
${forcelistValue}
\`\`\`

If the Chrome ADMX templates are not yet loaded in the Central Store, download
the Chrome Enterprise bundle and add \`chrome.admx\` / \`chrome.adml\` first.

### Registry (single test machine)

Run \`crm-capture-forcelist.reg\` as administrator. It writes index
\`"${FORCELIST_INDEX}"\` — confirm that index is free first:

\`\`\`powershell
reg query "HKLM\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist"
\`\`\`

An existing entry occupies index \`"1"\`. Do not overwrite it.

## 4. Confirm on a managed machine

1. \`gpupdate /force\`, then fully restart Chrome (all windows).
2. Open \`chrome://policy\` → **Reload policies**. \`ExtensionInstallForcelist\`
   should list the value above with status **OK**.
3. Open \`chrome://extensions\`. "CRM Capture (Prototype)" appears, marked
   *Installed by enterprise policy* and not removable by the user.
4. Open WhatsApp Web or Instagram and reload the tab. A 48px toolbar appears
   at the top of the page.

Installation is not instant — Chrome fetches the manifest shortly after
startup. If it has not appeared, check \`chrome://policy\` first, then look for
fetch errors at \`chrome://extensions\` with Developer mode on.

## 5. Shipping an update

1. Bump \`version\` in \`package.json\` **and** \`public/manifest.json\`.
2. \`npm run pack\`
3. \`node scripts/deploy.mjs ${baseUrl}\`
4. Upload the new \`.crx\` **and** the regenerated \`update.xml\`.

Chrome re-checks roughly every 5 hours and updates silently. The extension ID
never changes as long as \`key.pem\` is preserved.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Not in \`chrome://policy\` | GPO not applied, or Chrome not fully restarted |
| Policy OK, extension absent | Update manifest unreachable, wrong MIME type, or untrusted certificate |
| \`CRX_REQUIRED_PROOF_MISSING\` | \`.crx\` altered after signing — re-upload the packaged file unmodified |
| Downloads but will not enable | ID/version mismatch between \`update.xml\` and the \`.crx\` |
| 404 on the \`.crx\` from IIS | \`.crx\` MIME mapping missing — apply \`web.config\` |
`,
);

console.log(`[deploy] deploy/ written`);
console.log(`[deploy]   ${CRX_NAME}`);
console.log(`[deploy]   update.xml, web.config, .htaccess, nginx.conf.snippet`);
console.log(`[deploy]   crm-capture-forcelist.reg, README-IT.md`);
console.log(`\n  Extension ID : ${id}`);
console.log(`  Update URL   : ${updateUrl}`);
console.log(`  Forcelist    : ${forcelistValue}\n`);
if (isPlaceholder) {
  console.log('  WARNING: hosting URL is a placeholder.');
  console.log('  Re-run: node scripts/deploy.mjs https://your-real-host/path\n');
}
