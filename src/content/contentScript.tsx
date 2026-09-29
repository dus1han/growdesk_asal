import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { canSave, type CaptureSession, type Platform } from '../types/capture';
import type { ContentMessage, SaveResponse, StateResponse } from '../types/messages';
import { isStatePush } from '../types/messages';
import { detectPlatform } from '../utils/platform';
import { downloadTxt } from '../utils/txtExporter';
import { applyPageOffset, OFFSET_CLASS, removePageOffset, TOOLBAR_HEIGHT } from './pageOffset';
import { Toolbar, type FlashMessage } from './toolbar/Toolbar';
import toolbarCss from './toolbar/toolbar.css?inline';

const HOST_ID = 'crm-capture-toolbar-host';
const FLASH_MS = 1800;

const UNREACHABLE = 'Extension background unavailable. Reload the page.';

/** Promise wrapper around sendMessage that never rejects into React. */
async function request<T>(message: ContentMessage, onFailure: (error: string) => T): Promise<T> {
  try {
    const response = (await chrome.runtime.sendMessage(message)) as T | undefined;
    return response ?? onFailure('No response from background.');
  } catch (error) {
    console.error('[CRM Capture] Background unreachable.', error);
    return onFailure(UNREACHABLE);
  }
}

const send = (message: ContentMessage): Promise<StateResponse> =>
  request(message, (error) => ({ ok: false, session: null, error }));

const sendSave = (): Promise<SaveResponse> =>
  request({ type: 'CRM_SAVE' }, (error) => ({ ok: false, error }));

function App({ platform }: { platform: Platform }) {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const flashTimer = useRef<number | null>(null);

  const showFlash = useCallback((text: string, tone: FlashMessage['tone'] = 'success') => {
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = null;
    setFlash({ text, tone });

    // Confirmations fade; errors stay put. A vanishing "could not save" is
    // indistinguishable from a successful save, and with sheet-only saving
    // that would quietly cost the user the lead.
    if (tone === 'error') return;
    flashTimer.current = window.setTimeout(() => {
      setFlash(null);
      flashTimer.current = null;
    }, FLASH_MS);
  }, []);

  // Restore any capture that was already running (page reload, SPA remount).
  useEffect(() => {
    let cancelled = false;
    void send({ type: 'CRM_GET_STATE', platform }).then((response) => {
      if (!cancelled && response.ok) setSession(response.session);
    });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  // State pushed by the service worker after a context-menu capture.
  useEffect(() => {
    const listener = (message: unknown) => {
      if (!isStatePush(message)) return;
      setSession(message.session);
      if (message.flash) showFlash(message.flash, message.flashTone ?? 'success');
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [showFlash]);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const showPending = useCallback((text: string) => {
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = null;
    setFlash({ text, tone: 'hint' });
  }, []);

  const handleStart = useCallback(async () => {
    setBusy(true);
    const response = await send({ type: 'CRM_START', platform });
    setBusy(false);
    if (!response.ok) {
      showFlash(response.error ?? 'Could not start capture.', 'error');
      return;
    }
    setSession(response.session);
    showFlash('Capture started — highlight text, then right-click.', 'success');
  }, [platform, showFlash]);

  const handleStop = useCallback(async () => {
    // Re-validated here too, so a programmatic trigger can never save.
    if (!session || !canSave(session)) {
      showFlash('Capture a Number or Insta Name before saving.', 'error');
      return;
    }

    setBusy(true);
    showPending('Saving to Google Sheet…');
    const response = await sendSave();

    // The worker builds the optional TXT copy; only the page can download it.
    if (response.txt) {
      try {
        downloadTxt(response.txt.filename, response.txt.contents);
      } catch (error) {
        console.error('[CRM Capture] TXT download failed.', error);
      }
    }

    setBusy(false);

    if (!response.ok) {
      // Session is deliberately kept so STOP can simply be pressed again.
      showFlash(response.error ?? 'Could not save to the sheet. Press STOP to retry.', 'error');
      return;
    }

    setSession(null);
    showFlash('✓ Lead saved to Google Sheet');
  }, [session, showFlash, showPending]);

  return (
    <Toolbar
      session={session}
      platform={platform}
      flash={flash}
      busy={busy}
      onStart={() => void handleStart()}
      onStop={() => void handleStop()}
    />
  );
}

/** Builds the shadow host element that carries the toolbar. */
function createHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-crm-capture', 'toolbar');
  // Inline styles keep the host itself immune to page stylesheets.
  host.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'width:100%',
    'height:' + TOOLBAR_HEIGHT + 'px',
    'margin:0',
    'padding:0',
    'border:0',
    'z-index:2147483647',
    'pointer-events:auto',
    'color-scheme:light dark',
  ].join(';');
  return host;
}

let observer: MutationObserver | null = null;

/**
 * WhatsApp and Instagram rewrite large parts of the DOM as you navigate. This
 * watches only the direct children of <html> - it never reads page content -
 * and re-attaches the single toolbar host if the site detaches it.
 */
function keepMounted(host: HTMLElement, platform: Platform): void {
  observer?.disconnect();
  let scheduled = false;

  observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      // Drop any accidental duplicate before re-checking our own host.
      document.querySelectorAll('#' + HOST_ID).forEach((node) => {
        if (node !== host) node.remove();
      });
      if (!host.isConnected) document.documentElement.appendChild(host);
      if (!document.documentElement.classList.contains(OFFSET_CLASS)) applyPageOffset(platform);
    });
  });

  observer.observe(document.documentElement, { childList: true });
}

function mount(): void {
  if (document.getElementById(HOST_ID)) return;

  const platform = detectPlatform();
  if (!platform) {
    console.warn('[CRM Capture] Unsupported page - toolbar not injected.');
    return;
  }

  const host = createHost();
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = toolbarCss;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  document.documentElement.appendChild(host);
  applyPageOffset(platform);

  let root: Root;
  try {
    root = createRoot(mountPoint);
    root.render(<App platform={platform} />);
  } catch (error) {
    console.error('[CRM Capture] Failed to render toolbar.', error);
    host.remove();
    removePageOffset();
    return;
  }

  keepMounted(host, platform);

  window.addEventListener(
    'pagehide',
    () => {
      observer?.disconnect();
      observer = null;
      try {
        root.unmount();
      } catch {
        // The page is going away regardless.
      }
      host.remove();
      removePageOffset();
    },
    { once: true },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
