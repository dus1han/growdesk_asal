# GrowDesk Capture

Chrome Manifest V3 extension that captures leads from **WhatsApp Web** and **Instagram**
straight into **GrowDesk**. A 48px GrowDesk toolbar sits at the top of the page; you highlight
a name or number, right-click to assign it, pick treatments and other lists on the toolbar,
and press STOP. GrowDesk adds the customer, or updates them if they already exist.

The fields, their order and which are required come from GrowDesk
(**Administration → Capture Tool**). The toolbar re-reads them when the page loads, when the
tab comes back into view, every minute while it's visible, and again before saving, so an
admin change applies without reinstalling or even pressing START again.

## Connect it (once per PC)

1. In GrowDesk: **Administration → Capture Tool → Connections → Add connection**. Copy the
   address, client ID and client secret (the secret is shown once).
2. Click the GrowDesk Capture icon in Chrome to open its settings. Paste the three values and
   press **Save & connect**. Chrome asks to allow access to the GrowDesk address; choose Allow.
3. You'll see *Connected as "Reception PC"*.

Both `https://` and plain `http://` addresses work. A bare IP such as `169.58.92.105:3110`
means `http://`. Over `http` the connection is not encrypted, and the settings page says so:
fine to get started, but move GrowDesk to `https` once it has a domain.

Revoking the connection in GrowDesk stops this PC on its next request.

## Capture a lead

1. Open `https://web.whatsapp.com/` or `https://www.instagram.com/` and press **START**.
2. Right-click the name or number, then **GrowDesk Capture → Set as Name / Set as WhatsApp Number / …**
   This works on text WhatsApp won't let you select, such as the name and number in Contact info.
   To take only part of a longer message, highlight that part first. (Notes collect several:
   **Add to Notes**.)
3. Click a list chip (e.g. **Interested Treatments ▾**) to choose from GrowDesk's lists. Click
   a captured chip to see or remove its value.
4. Press **STOP**. STOP is available once every required field (red `*`) is filled and there's
   a WhatsApp number or an Instagram name.

A card slides in from the right: the customer, **New customer** or **Updated**, what was captured,
and **Open in GrowDesk**. The toolbar also shows *"Sarah Fernando was added."* or *"… was updated."*, plus any notes from
GrowDesk (e.g. a booked customer's stage was kept). If saving fails, nothing is lost: fix what
the message says and press STOP again. **✕** discards the capture.

Lead source is preset to WhatsApp or Instagram when GrowDesk has a source with that name.

## Build

The extension lives in the GrowDesk repository, in `extension/`, next to the web app
(`frontend/`). Run these from `extension/`:

```bash
npm install
npm run build             # typecheck + logic checks + production build into dist/
npm run dev               # same build in watch mode
npm run verify            # logic checks only
npm run key               # generate key.pem + stable extension ID (run once)
npm run pack              # signed .crx for distribution
npm run publish:growdesk  # pack, then copy the download + package into ../frontend
npm run serve             # local update server (http://localhost:8787) for a policy-installed PC
```

`publish:growdesk` is how a new version reaches users: GrowDesk offers the download on its
"GrowDesk Capture" page and serves the package for policy installs. See
[docs/CAPTURE_TOOLBAR_IT.md](../docs/CAPTURE_TOOLBAR_IT.md). Bump the version in `package.json`
and `public/manifest.json` first.

The extension ID is `mnhjjndckpjiglmdlpelboiebdjcfaid`, fixed by `key.pem` (and the `key` in
the manifest). Keep that key: losing it changes the ID and invalidates the deployed policy.

## Run it locally (no policy change needed)

On a machine where Chrome policy blocks extensions, use Google's unmanaged developer build:

```bash
npm run browser:install   # one-time, downloads Chrome for Testing into .browser/
npm start                 # builds, launches it with the extension loaded
```

Or, where extensions are allowed: `chrome://extensions` → Developer mode → **Load unpacked** →
the `dist` folder. After a rebuild, press the reload icon on the extension card, then reload
the site tab.

## Privacy

Only text you deliberately highlight and assign is read. The extension does not scrape
conversations, read contacts, scan the page or observe messages. The `MutationObserver`
watches only the direct children of `<html>`, to keep the toolbar attached across navigation.

Network access goes to one place: the GrowDesk address you connect, after you allow it in
Chrome's prompt. Permissions: `storage`, `contextMenus`, host access to `web.whatsapp.com` and
`www.instagram.com`, and (optional, granted per address) the GrowDesk server.

The client secret is stored in this Chrome profile's extension storage. Tokens last 15 minutes
and are kept only for the browser session.

## Project structure

```
src/
  api/growdesk.ts          GrowDesk Capture API client: token, config, send lead
  background/
    serviceWorker.ts       message router, right-click handling, save
    contextMenus.ts        builds "GrowDesk Capture → Set as …" from the field setup
  content/
    contentScript.tsx      shadow-DOM host, React mount, refresh, START/STOP
    pageOffset.ts          pushes page content down by the toolbar height
    toolbar/
      Toolbar.tsx          the bar: brand, state, field chips, status, buttons
      Picker.tsx           list / date / yes-no picker under a chip
      icons.tsx            GrowDesk mark and small icons
      toolbar.css          scoped styles, light + dark
  options/options.ts       settings page (public/options.html)
  storage/                 settings (chrome.storage.local), per-tab session (session storage)
  types/                   capture model + rules, GrowDesk API shapes, messages
  utils/                   platform detection, highlight tidying
public/manifest.json       MV3 manifest (copied to dist/)
scripts/                   build, icon drawing, logic checks, packing
```

GrowDesk's API is documented in [docs/CAPTURE_API.md](../docs/CAPTURE_API.md).
