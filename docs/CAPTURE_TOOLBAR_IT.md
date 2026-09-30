# GrowDesk Capture: installing the toolbar on office PCs

**Written for: the IT / Chrome administrator.**

GrowDesk Capture is GrowDesk's Chrome extension. It adds a toolbar to WhatsApp Web and
Instagram so staff can send a lead to GrowDesk in a few clicks.

## At a glance

| Item | Value |
| --- | --- |
| Name | GrowDesk Capture |
| Extension ID | `mnhjjndckpjiglmdlpelboiebdjcfaid` (the same ID as the older "CRM Capture" prototype) |
| Source | This repository, `extension/`. Built in-house, not from the Chrome Web Store. |
| Runs on | `https://web.whatsapp.com/*`, `https://www.instagram.com/*` |
| Sends data to | The GrowDesk address the user connects to, and nothing else |
| Permissions | `storage`, `contextMenus`, plus access to the GrowDesk address, granted in Chrome's own prompt |

It reads only text the user highlights and assigns, never whole conversations. Each PC signs in
with its own connection (client ID and secret), created in GrowDesk under **Administration →
Capture Tool → Connections**. A connection can be revoked there at any time.

## Install on every managed PC (recommended)

Add one entry to the Chrome policy **ExtensionInstallForcelist**:

```
mnhjjndckpjiglmdlpelboiebdjcfaid;https://<growdesk address>/capture/update.xml
```

GrowDesk shows the exact line, with its own address filled in, under **Administration →
Capture Tool → Get the toolbar**. Chrome then installs the extension from GrowDesk and keeps it
updated. When a new version is published in GrowDesk, PCs pick it up on Chrome's next update
check, within a few hours.

- Windows registry: `HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist`. Add a
  string value named with the next free number.
- Group Policy or Intune: the same value, in the Chrome **Extensions → Configure the list of
  force-installed apps and extensions** setting.

**Requirement: HTTPS.** Chrome accepts an update address only over `https`, apart from
`localhost`. GrowDesk is currently served over plain `http` at `http://169.58.92.105:3110`, so
this route works once GrowDesk has a domain name with HTTPS. Until then, use one of the two
options below.

## Until GrowDesk has HTTPS

**A. PCs that allow extensions:** a user downloads the toolbar from GrowDesk (its "GrowDesk
Capture" page, or Get the toolbar), unzips it, and uses Chrome's **Load unpacked**.

**B. The PC already set up with a local update server** (the machine used to develop the
toolbar): it force-installs from `http://localhost:8787/update.xml`. That server runs from this
repository with `cd extension` then `npm run serve`, and must be running when Chrome checks for
updates.

## One-time fix: replacing the old "CRM Capture" prototype

A PC that force-installed the old prototype (version 0.1.0) will not update to GrowDesk Capture
by itself. Version 0.1.0 has no update address inside it, and Chrome only uses the policy
address for the first install.

To switch it over, with administrator rights:

1. In `ExtensionInstallForcelist`, delete the value that starts with
   `mnhjjndckpjiglmdlpelboiebdjcfaid;`. Note down its text first.
2. On the PC, open `chrome://policy` and click **Reload policies**. The old "CRM Capture
   (Prototype)" disappears from `chrome://extensions`.
3. Add the value back: the GrowDesk line above once HTTPS is ready, or the same localhost
   line for option B.
4. Reload policies again. GrowDesk Capture (1.0.2 or later) installs. Every later version
   includes its update address, so this step is never needed again.

## Also noticed on the development PC

The first `ExtensionInstallForcelist` entry,
`lhampmhmkbmccdgfkdbakgbbfpphamdb:http://clients2.google.com/service/update2/crx`, uses `:`
where Chrome expects `;`. Chrome reports it as "Invalid extension ID" in `chrome://policy`, so
that extension is not being installed. The fix is to change `:` after the ID to `;`.

## For developers: publishing a new version

In `extension/`:

```
npm run publish:growdesk
```

This builds, packs and signs the extension, then copies the download and the package into the
GrowDesk web app (`frontend/public/`). Deploying GrowDesk then serves the new version to every
PC. For PCs that install from GrowDesk, build with the GrowDesk address baked in, so they keep
updating from it:

```
GROWDESK_UPDATE_URL=https://<growdesk address>/capture/update.xml npm run publish:growdesk
```

Bump the version in `extension/package.json` and `extension/public/manifest.json` first. Chrome
only installs a higher version. The signing key `extension/key.pem` stays on the build PC and is
never committed; losing it would change the extension ID.
