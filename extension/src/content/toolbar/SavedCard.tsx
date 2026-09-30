import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, LogoMark } from './icons';

export interface SavedLead {
  customerId: number;
  name: string;
  action: 'created' | 'updated';
  /** WhatsApp number or Instagram name, as captured. */
  contact?: string;
  treatments?: string;
  stage?: string;
  warnings: string[];
  /** The customer's page in GrowDesk. */
  url: string;
}

const SHOW_MS = 7000;
const SHOW_WITH_NOTES_MS = 12000;
const LEAVE_MS = 280;

const initials = (name: string) =>
  name
    .replace(/^@/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '•';

/**
 * The card that slides in from the right after a lead is saved: who it was, whether GrowDesk
 * added or updated them, what was captured, and a link to open them. It slides away by itself;
 * hovering keeps it open.
 */
export function SavedCard({ lead, onClose }: { lead: SavedLead; onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const closing = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setLeaving(true);
    setTimeout(onClose, LEAVE_MS);
  }, [onClose]);

  useEffect(() => {
    if (hovered) return;
    const t = setTimeout(close, lead.warnings.length ? SHOW_WITH_NOTES_MS : SHOW_MS);
    return () => clearTimeout(t);
  }, [hovered, close, lead.warnings.length]);

  const created = lead.action === 'created';
  return (
    <div
      className={`gd-saved${leaving ? ' gd-saved--leaving' : ''}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="gd-saved-head">
        <span className="gd-saved-brand">
          <LogoMark />
          Saved in GrowDesk
        </span>
        <button type="button" className="gd-saved-close" onClick={close} aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <div className="gd-saved-person">
        <span className="gd-saved-avatar">{initials(lead.name)}</span>
        <span className="gd-saved-who">
          <span className="gd-saved-name">{lead.name}</span>
          {lead.contact && <span className="gd-saved-contact">{lead.contact}</span>}
        </span>
        <span className={`gd-saved-badge${created ? ' gd-saved-badge--new' : ''}`}>
          <CheckIcon />
          {created ? 'New customer' : 'Updated'}
        </span>
      </div>

      {(lead.treatments || lead.stage) && (
        <div className="gd-saved-tags">
          {lead.treatments?.split(', ').map((t) => (
            <span key={t} className="gd-saved-tag">
              {t}
            </span>
          ))}
          {lead.stage && <span className="gd-saved-tag gd-saved-tag--stage">{lead.stage}</span>}
        </div>
      )}

      {lead.warnings.length > 0 && (
        <ul className="gd-saved-notes">
          {lead.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <a className="gd-saved-open" href={lead.url} target="_blank" rel="noopener noreferrer">
        Open in GrowDesk →
      </a>
      {!hovered && !leaving && (
        <span
          className="gd-saved-timer"
          style={{ animationDuration: `${lead.warnings.length ? SHOW_WITH_NOTES_MS : SHOW_MS}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
