# CRM Capture — deployment request

**Written for: the IT / Chrome browser administrator.**

## Summary

An internal prototype Chrome extension cannot be installed on managed machines
because Chrome policy blocks all extensions not on the allowlist. This document
covers what the extension does, what it accesses, and the requested deployment
route. No policy change has been made by anyone outside IT.

**Action requested:** add one entry to `ExtensionInstallForcelist` (details in
"Deployment route" below). The step-by-step runbook is `deploy/README-IT.md`.

| Item | Value |
| --- | --- |
| Name | CRM Capture (Prototype) |
| Version | 0.1.0 |
| Extension ID | `mnhjjndckpjiglmdlpelboiebdjcfaid` |
| Manifest | V3 |
| Signed package | `crm-capture-0.1.0.crx` (CRX3, 56 KB) |
| Author | Internal — built in-house, not from the Chrome Web Store |

## Why it is currently blocked

Current policy on the machine (`HKLM\SOFTWARE\Policies\Google\Chrome`):

| Policy | Value | Effect |
| --- | --- | --- |
| `ExtensionInstallBlocklist` | `*` | Blocks every extension not explicitly allowlisted |
| `ExtensionInstallAllowlist` | 25 IDs | The only extensions users may install |
| `BlockExternalExtensions` | `1` | Blocks registry / external installs |
| `ExtensionInstallForcelist` | 1 ID | Silently installed at startup |

`ExtensionInstallBlocklist = *` also covers **Load Unpacked**, so Developer mode
does not bypass it. A `.crx` file does not bypass it either — Chrome refuses any
extension whose ID is not allowlisted, no matter how it is delivered. The ID must
be added to policy; that is the only route.

## What it does

The user presses **START** in a toolbar shown on WhatsApp Web / Instagram,
highlights a piece of text, right-clicks, and assigns it as Name, Number, or
Instagram Name. Pressing **STOP** sends those fields to the configured CRM
endpoint and clears the session. If the send fails, the capture is kept so the
user can retry — it is never silently discarded.

## Security profile

> **Changed in 0.3.0.** Earlier versions made no network requests at all. This
> version sends each captured lead to one CRM endpoint. Please re-review.

- **Outbound data: one endpoint, chosen by the user.** On STOP, the extension
  POSTs a single JSON record to an HTTPS endpoint the user configures in the
  extension's options page. It has no backend of its own, no telemetry, and no
  other outbound traffic. Nothing is transmitted until an endpoint is set.
- **The endpoint's origin is not pre-granted.** The manifest declares no CRM
  host. The user must approve the specific origin through Chrome's own
  permission prompt before any request can be made; until then the extension
  refuses to send and says so. See "Restricting the endpoint" below if you want
  that choice taken away from the user.
- **What is transmitted:** captured-at timestamp, Name, Number, Instagram Name,
  the source site (WhatsApp or Instagram), and an optional device label. Nothing
  else — no page content, no conversation data, no browsing history.
- **No page scraping.** It reads only text the user has deliberately highlighted
  and explicitly assigned via the right-click menu. It does not read
  conversations, contacts, or page content. Its `MutationObserver` watches only
  the direct children of `<html>`, solely to keep its own toolbar attached
  during single-page-app navigation.
- **No persistent storage of leads.** Capture state lives in
  `chrome.storage.session`, which is memory-backed and cleared when the browser
  closes. The endpoint URL and credential live in `chrome.storage.local`.
- **Credential handling.** The endpoint URL and token are entered by the user
  and stored locally. They are never compiled into the build and never appear
  in the packaged `.crx`.

### Restricting the endpoint

If leads should only ever reach one approved system, do not rely on the user
choosing correctly. Use the `ExtensionSettings` policy to pin the extension's
runtime host access:

```
"runtime_blocked_hosts": ["*://*/*"],
"runtime_allowed_hosts": ["*://crm.your-company.com"]
```

That makes any other endpoint unreachable regardless of what the user types.

### Permissions requested

| Permission | Type | Why |
| --- | --- | --- |
| `storage` | required | Hold the in-progress capture, and the user's endpoint settings |
| `contextMenus` | required | Add the "CRM Capture" right-click entries |
| `https://web.whatsapp.com/*` | required host | Show the toolbar on WhatsApp Web |
| `https://www.instagram.com/*` | required host | Show the toolbar on Instagram |
| `https://*/*` | **optional** host | Not granted at install. The user grants only their CRM's origin, via Chrome's prompt, when they save it in options |

No `<all_urls>`, no `downloads`, no `tabs`, no `webRequest`, no `scripting`,
no `cookies`, no `nativeMessaging`. The two site hosts are the only hosts
granted at install time; anything else requires an explicit user grant, and can
be constrained by policy as shown above.

## Deployment route: Option B (selected)

**Force-install from internal HTTPS hosting.** Force-installed extensions are
exempt from `ExtensionInstallBlocklist`, so no allowlist entry is needed, and
Chrome keeps the extension updated automatically.

Everything required is generated into `deploy/` by:

```bash
npm run pack
node scripts/deploy.mjs https://<internal-host>/chrome/crm-capture
```

That folder contains the signed `.crx`, `update.xml`, web-server MIME config for
IIS / Apache / nginx, a single-machine test `.reg`, and a step-by-step runbook
(`deploy/README-IT.md`). **Start with `deploy/README-IT.md`** — the rest of this
document is background on what the extension does and why it is blocked today.

### Summary of the policy change requested

```
Computer Configuration -> Administrative Templates -> Google -> Google Chrome
  -> Extensions -> Configure the list of force-installed apps and extensions

Value:  mnhjjndckpjiglmdlpelboiebdjcfaid;https://<internal-host>/chrome/crm-capture/update.xml
```

Hosting must be HTTPS with a certificate trusted by managed machines, and must
allow anonymous read — Chrome fetches the update manifest from the browser
process without user credentials, so SharePoint and OneDrive will not work.

## Alternatives considered (not selected)

### Option A — Allowlist only (lightest; user installs)

Add the ID to the existing allowlist. Users then install
`crm-capture-0.1.0.crx` themselves.

```
HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist
  "26" = "mnhjjndckpjiglmdlpelboiebdjcfaid"
```

GPO: *Computer Configuration → Administrative Templates → Google → Google Chrome
→ Extensions → Configure extension installation allow list*

Note that with `BlockExternalExtensions = 1`, manual `.crx` drag-and-drop may
still be refused. If so, use Option B.

### Option C — Private Chrome Web Store listing (best for long-term)

Publish under the company's Google Workspace developer account with visibility
set to **Private** (visible only to the organisation). Chrome then handles
hosting, signing, and updates. Requires a one-time $5 developer registration.
Deploy afterwards via allowlist or forcelist using the same ID.

## Rebuilding

```bash
npm install
npm run build   # typecheck + tests + dist/
npm run pack    # signed .crx
node scripts/deploy.mjs https://<internal-host>/chrome/crm-capture   # deploy/
```

`key.pem` in the project root is the signing key. **It determines the extension
ID.** If it is lost, the ID changes and policy must be updated again. It is
gitignored and should be stored in the team's secret manager.

## Scope

This is a prototype for evaluation. It has no backend, no database and no
login. It delivers leads to a single user-configured HTTPS endpoint and does
nothing else over the network.
