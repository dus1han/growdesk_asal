# CRM Capture (Prototype)

Chrome Manifest V3 extension that captures lead details from text you highlight
on **WhatsApp Web** and **Instagram**, and saves them to a local `.txt` file.

This is a test/prototype build. It has no backend, no database and no login.
On STOP it sends one JSON record to an HTTPS endpoint you configure in the
extension's options page — nothing is sent anywhere until you set one.

## Workflow

1. Open `https://web.whatsapp.com/` or `https://www.instagram.com/`.
2. A 48px toolbar appears at the very top of the page and pushes the site down.
3. Press **START**.
4. Highlight text, right-click, then choose
   **CRM Capture → Set as Name / Set as Number / Set as Insta Name**.
5. The toolbar ticks update and briefly confirm the captured value.
6. Press **STOP** once a Number **or** an Insta Name exists. STOP means *stop and save*:
   it downloads `lead-YYYY-MM-DD-HH-mm-ss.txt` and resets the session.

### Save rule

A capture can only be saved when at least one contact identifier exists:

| Captured                  | STOP      |
| ------------------------- | --------- |
| Name + Number             | enabled   |
| Name + Insta Name         | enabled   |
| Number only               | enabled   |
| Insta Name only           | enabled   |
| Name only                 | disabled  |
| Nothing                   | disabled  |

### TXT output

```
Name: John Fernando
Number: +94 77 123 4567
Instagram Name: @johnfernando
Source: Instagram
Captured At: 2026-09-16 09:45:31
```

Missing fields are written as `Not captured`.

## Build

```bash
npm install
npm run build     # typecheck + logic tests + production build into dist/
npm run dev       # same build in watch mode
npm run verify    # capture/validation test cases only
npm run key       # generate key.pem + stable extension ID (run once)
npm run pack      # signed .crx for distribution
node scripts/deploy.mjs https://<internal-host>/chrome/crm-capture   # deploy/
```

The extension ID is `mnhjjndckpjiglmdlpelboiebdjcfaid`, fixed by `key.pem`.
Keep that key — losing it changes the ID and invalidates the deployed policy.

## Run it locally (no policy change needed)

On a machine where Chrome policy blocks extensions, use Google's unmanaged
developer build. It reads no corporate policy key, runs on its own profile, and
leaves the managed Chrome install untouched.

```bash
npm run browser:install   # one-time, downloads Chrome for Testing into .browser/
npm start                 # builds, launches it with the extension loaded
```

Verification helpers, with that browser running:

```bash
npm run verify:ui       # toolbar is mounted, shadow DOM, sizing, initial state
npm run verify:layout   # toolbar covers nothing and clips nothing
npm run verify:e2e      # START -> capture -> STOP -> real TXT download -> reset
```

## Load in Chrome

> **On a managed machine this may be blocked.** If Chrome policy sets
> `ExtensionInstallBlocklist = *`, Load Unpacked is refused and Developer mode
> does not help. See [DEPLOYMENT.md](DEPLOYMENT.md) — deployment goes through
> `ExtensionInstallForcelist` and internal HTTPS hosting instead.

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the **`dist`** folder in this project.
5. Open WhatsApp Web or Instagram and reload the tab.

After a rebuild, press the reload icon on the extension card, then reload the site tab.

## Privacy

Only text you deliberately highlight and assign via the context menu is read.
The extension does not scrape conversations, read contacts, scan the page, or
observe messages. The `MutationObserver` watches only the direct children of
`<html>`, purely to keep its own toolbar attached across SPA navigation.

Permissions requested: `storage`, `contextMenus`, and host access limited to
`web.whatsapp.com` and `www.instagram.com`.

## Project structure

```
src/
  background/
    serviceWorker.ts     message router, context-menu clicks, tab lifecycle
    contextMenus.ts      builds / shows / hides the CRM Capture submenu
  content/
    contentScript.tsx    shadow-DOM host, React mount, SPA re-attach, STOP+save
    pageOffset.ts        pushes page content down by the toolbar height
    toolbar/
      Toolbar.tsx        toolbar UI (ticks, status line, START/STOP)
      toolbar.css        scoped styles, light + dark
  storage/
    captureSession.ts    chrome.storage.session reads/writes, keyed per tab
  types/
    capture.ts           CaptureSession model + canSave() rule
    messages.ts          message contracts between content script and worker
  utils/
    platform.ts          hostname -> WhatsApp | Instagram
    txtExporter.ts       timestamp, filename, TXT body, blob download
    normalize.ts         minimal trimming / Insta handle tidy-up
public/manifest.json     MV3 manifest (copied to dist/)
scripts/                 build, icon generation, logic tests
```
