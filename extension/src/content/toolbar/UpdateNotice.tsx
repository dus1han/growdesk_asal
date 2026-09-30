import { useEffect, useRef, useState } from 'react';
import type { LatestRelease } from '../../types/growdesk';
import { UpdateIcon } from './icons';

/**
 * "Update" on the bar when GrowDesk offers a newer toolbar. Policy-installed PCs update
 * themselves; a Load unpacked install needs the new files unzipped over the old folder, then a
 * reload, which the panel does in one click.
 */
export function UpdateNotice({
  latest,
  current,
  installType,
  onReload,
  onOpenExtensions,
}: {
  latest: LatestRelease;
  current: string;
  installType?: string;
  onReload: () => void;
  onOpenExtensions: () => void;
}) {
  // Opens by itself: START stays blocked until the update is installed.
  const [open, setOpen] = useState(true);
  const extensionsLink = (
    <button type="button" className="gd-link gd-update-link" onClick={onOpenExtensions}>
      chrome://extensions
    </button>
  );
  const wrap = useRef<HTMLSpanElement>(null);
  const automatic = installType === 'admin';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !e.composedPath().includes(wrap.current)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <span ref={wrap} className="gd-update-wrap">
      <button type="button" className="gd-update-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={`Version ${latest.version} is available`}>
        <UpdateIcon />
        Update
      </button>
      {open && (
        <div className="gd-pop gd-update-pop" role="dialog" aria-label="Update GrowDesk Capture">
          <p className="gd-pop-head">Update available</p>
          <div className="gd-pop-body">
            <p>
              Version <strong>{latest.version}</strong> is ready. This PC has {current}. Update to start capturing again.
            </p>
            {automatic ? (
              <p className="gd-pop-hint">
                Open {extensionsLink}, turn on <strong>Developer mode</strong> and click <strong>Update</strong>.
              </p>
            ) : (
              <ol className="gd-update-steps">
                <li>
                  <a href={latest.download} target="_blank" rel="noopener noreferrer" className="gd-update-link">
                    Download version {latest.version}
                  </a>
                </li>
                <li>Unzip it into the same folder you installed GrowDesk Capture from, replacing the old files.</li>
                <li>
                  <button type="button" className="gd-pop-btn gd-pop-btn--primary" onClick={onReload}>
                    Reload the toolbar
                  </button>
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
