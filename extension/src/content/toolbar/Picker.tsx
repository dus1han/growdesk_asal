import { useEffect, useMemo, useRef, useState } from 'react';
import { fieldKind, hasValue, optionsFor, type FieldValue } from '../../types/capture';
import type { ConfigBundle, ConfigField } from '../../types/growdesk';
import { CheckIcon } from './icons';

export interface PickerProps {
  field: ConfigField;
  bundle: ConfigBundle;
  value: FieldValue | undefined;
  /** The chip it opens under (viewport coordinates). */
  anchor: DOMRect;
  anchorEl: HTMLElement;
  onChange: (value: FieldValue | null) => void;
  onClose: () => void;
}

const WIDTH = 260;
const SEARCH_FROM = 8;

/**
 * The small panel under a chip: a list to pick from, a date, yes/no, or, for highlighted text,
 * the captured value with a way to remove it.
 */
export function Picker({ field, bundle, value, anchor, anchorEl, onChange, onClose }: PickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const kind = fieldKind(field);

  // Close on a click anywhere else (the page or the toolbar), and on Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const path = e.composedPath();
      if (ref.current && !path.includes(ref.current) && !path.includes(anchorEl)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchorEl.focus();
      }
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [anchorEl, onClose]);

  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - WIDTH - 8));
  const style = { left, top: anchor.bottom + 8 };

  return (
    <div ref={ref} className="gd-pop" style={style} role="dialog" aria-label={field.label}>
      <p className="gd-pop-head">{field.label}</p>
      {kind === 'single' || kind === 'multi' ? (
        <OptionList field={field} bundle={bundle} value={value} multi={kind === 'multi'} onChange={onChange} onClose={onClose} />
      ) : kind === 'date' ? (
        <DatePick value={value} onChange={onChange} onClose={onClose} />
      ) : kind === 'boolean' ? (
        <YesNo value={value} onChange={onChange} onClose={onClose} />
      ) : (
        <Highlighted field={field} value={value} onChange={onChange} onClose={onClose} />
      )}
    </div>
  );
}

function OptionList({
  field,
  bundle,
  value,
  multi,
  onChange,
  onClose,
}: {
  field: ConfigField;
  bundle: ConfigBundle;
  value: FieldValue | undefined;
  multi: boolean;
  onChange: (v: FieldValue | null) => void;
  onClose: () => void;
}) {
  const options = optionsFor(field, bundle);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(Array.isArray(value) ? value : typeof value === 'number' ? [value] : []), [value]);
  const shown = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : options;
  const listRef = useRef<HTMLDivElement>(null);

  // Focus the search box, or the first option, so the list works from the keyboard.
  useEffect(() => {
    const first = listRef.current?.parentElement?.querySelector<HTMLElement>('.gd-pop-search, .gd-opt');
    first?.focus();
  }, []);

  const toggle = (id: number) => {
    if (!multi) {
      onChange(selected.has(id) ? null : id);
      onClose();
      return;
    }
    const next = selected.has(id) ? [...selected].filter((x) => x !== id) : [...selected, id];
    onChange(next.length ? next : null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('.gd-opt') ?? []);
    const root = listRef.current?.getRootNode() as ShadowRoot | Document;
    const i = items.indexOf(root.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  if (options.length === 0) {
    return <p className="gd-empty">Nothing to choose yet. Add options in GrowDesk → Administration.</p>;
  }

  return (
    <>
      {options.length >= SEARCH_FROM && (
        <input className="gd-pop-search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} />
      )}
      <div ref={listRef} className="gd-pop-list" role="listbox" aria-multiselectable={multi} onKeyDown={onKeyDown}>
        {shown.length === 0 && <p className="gd-empty">No matches.</p>}
        {shown.map((o) => {
          const on = selected.has(o.id);
          return (
            <button key={o.id} type="button" role="option" aria-selected={on} className={`gd-opt${on ? ' gd-opt--on' : ''}`} onClick={() => toggle(o.id)}>
              <span className={`gd-box${multi ? '' : ' gd-box--radio'}`}>{on && <CheckIcon />}</span>
              {o.label}
            </button>
          );
        })}
      </div>
      {(multi || hasValue(value)) && (
        <div className="gd-pop-foot">
          <button type="button" className="gd-pop-btn gd-pop-btn--danger" onClick={() => onChange(null)} disabled={!hasValue(value)}>
            Clear
          </button>
          {multi && (
            <button type="button" className="gd-pop-btn gd-pop-btn--primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      )}
    </>
  );
}

function DatePick({ value, onChange, onClose }: { value: FieldValue | undefined; onChange: (v: FieldValue | null) => void; onClose: () => void }) {
  return (
    <>
      <div className="gd-pop-body">
        <input
          className="gd-date"
          type="date"
          autoFocus
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
      <div className="gd-pop-foot">
        <button type="button" className="gd-pop-btn gd-pop-btn--danger" onClick={() => onChange(null)}>
          Clear
        </button>
        <button type="button" className="gd-pop-btn gd-pop-btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}

function YesNo({ value, onChange, onClose }: { value: FieldValue | undefined; onChange: (v: FieldValue | null) => void; onClose: () => void }) {
  const pick = (v: boolean) => {
    onChange(value === v ? null : v);
    onClose();
  };
  return (
    <div className="gd-pop-body gd-yesno">
      <button type="button" autoFocus className={`gd-pop-btn${value === true ? ' gd-pop-btn--on' : ''}`} onClick={() => pick(true)}>
        Yes
      </button>
      <button type="button" className={`gd-pop-btn${value === false ? ' gd-pop-btn--on' : ''}`} onClick={() => pick(false)}>
        No
      </button>
    </div>
  );
}

function Highlighted({
  field,
  value,
  onChange,
  onClose,
}: {
  field: ConfigField;
  value: FieldValue | undefined;
  onChange: (v: FieldValue | null) => void;
  onClose: () => void;
}) {
  const verb = field.type === 'textarea' ? `Add to ${field.label}` : `Set as ${field.label}`;
  return (
    <>
      <div className="gd-pop-body">
        {hasValue(value) && <div className="gd-pop-value">{String(value)}</div>}
        <p className="gd-pop-hint">
          {hasValue(value) ? 'To change it, highlight' : 'Highlight'} the text on the page, right-click, then choose{' '}
          <strong>GrowDesk Capture → {verb}</strong>.
        </p>
      </div>
      {hasValue(value) && (
        <div className="gd-pop-foot">
          <button
            type="button"
            className="gd-pop-btn gd-pop-btn--danger"
            autoFocus
            onClick={() => {
              onChange(null);
              onClose();
            }}
          >
            Remove
          </button>
        </div>
      )}
    </>
  );
}
