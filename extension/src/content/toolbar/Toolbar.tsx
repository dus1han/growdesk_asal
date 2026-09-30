import { useCallback, useRef, useState } from 'react';
import { displayValue, enabledFields, fieldKind, hasValue, saveBlocker, type CaptureSession, type FieldValue, type Platform } from '../../types/capture';
import type { ConfigBundle, ConfigField } from '../../types/growdesk';
import { CaretIcon, CheckIcon, CloseIcon, HelpIcon, LogoMark, PlayIcon, SendIcon } from './icons';
import { Picker } from './Picker';

export interface StatusMessage {
  text: string;
  tone: 'success' | 'error' | 'warning' | 'hint' | 'pending';
}

export interface ToolbarProps {
  session: CaptureSession | null;
  bundle: ConfigBundle | null;
  configured: boolean;
  platform: Platform;
  status: StatusMessage | null;
  busy: boolean;
  /** The field GrowDesk last rejected, highlighted until it changes. */
  errorField: string | null;
  onStart: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onSetValue: (key: string, value: FieldValue | null) => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  /** Draw a box around text on the page to capture it into a field (from the field's chip). */
  onDraw: (key: string) => void;
}

/**
 * The GrowDesk Capture bar, pinned to the top of WhatsApp Web and Instagram. Before START it
 * shows the fields GrowDesk asks for; while capturing, each chip fills in as values arrive, and
 * list fields open a picker.
 */
export function Toolbar(props: ToolbarProps) {
  const { session, bundle, configured, platform, status, busy, errorField } = props;
  const active = Boolean(session?.active);
  const fields = enabledFields(bundle);
  const blocker = active ? saveBlocker(session, bundle) : null;
  const [open, setOpen] = useState<{ key: string; el: HTMLElement } | null>(null);
  const close = useCallback(() => setOpen(null), []);

  // While capturing, the toolbar keeps saying what is still needed; messages take priority.
  const shown: StatusMessage | null = status ?? (active && blocker ? { text: blocker, tone: 'hint' } : null);
  const openField = open && bundle ? fields.find((f) => f.key === open.key) : undefined;

  return (
    <div className="gd">
      <div className={`gd-bar${active ? ' gd-bar--active' : ''}`} role="toolbar" aria-label="GrowDesk Capture">
        <button type="button" className="gd-brand" onClick={props.onOpenSettings} title="GrowDesk Capture settings">
          <LogoMark />
          <span className="gd-brand-name">GrowDesk</span>
          <span className="gd-brand-sub">Capture</span>
        </button>
        <span className="gd-divider" aria-hidden="true" />

        {active ? (
          <span className="gd-state gd-state--active">
            <span className="gd-pulse" aria-hidden="true" />
            Capturing
          </span>
        ) : (
          <span className="gd-state">{platform}</span>
        )}

        {fields.length > 0 && (
          <>
            <span className="gd-divider" aria-hidden="true" />
            <span className="gd-fields">
              {fields.map((f) => (
                <Chip
                  key={f.key}
                  field={f}
                  bundle={bundle!}
                  value={session?.values[f.key]}
                  active={active}
                  expanded={open?.key === f.key}
                  error={errorField === f.key}
                  onClick={(el) => setOpen((o) => (o?.key === f.key ? null : { key: f.key, el }))}
                />
              ))}
            </span>
          </>
        )}

        <span className="gd-divider" aria-hidden="true" />
        <span className={`gd-status${shown ? ` gd-status--${shown.tone}` : ''}`} role="status" aria-live="polite" title={shown?.text}>
          {!configured && !status ? (
            <>
              Not connected to GrowDesk.{' '}
              <button type="button" className="gd-link" onClick={props.onOpenSettings}>
                Connect
              </button>
            </>
          ) : (
            (shown?.text ?? '')
          )}
        </span>

        <button type="button" className="gd-icon-btn gd-icon-btn--help" onClick={props.onOpenGuide} title="How to use GrowDesk Capture" aria-label="How to use GrowDesk Capture">
          <HelpIcon />
        </button>
        {active && (
          <button type="button" className="gd-icon-btn" onClick={props.onDiscard} disabled={busy} title="Discard this capture" aria-label="Discard this capture">
            <CloseIcon />
          </button>
        )}
        {active ? (
          <button
            type="button"
            className="gd-btn gd-btn--stop"
            onClick={props.onStop}
            aria-disabled={Boolean(blocker) || busy}
            disabled={busy}
            title={blocker ?? 'Stop and save this lead to GrowDesk'}
          >
            {busy ? <span className="gd-spinner" aria-hidden="true" /> : <SendIcon />}
            STOP
          </button>
        ) : (
          // START needs a GrowDesk connection; until then it stays disabled next to the Connect link.
          <button
            type="button"
            className="gd-btn"
            onClick={props.onStart}
            disabled={busy || !configured}
            title={configured ? 'Start capturing a lead' : 'Connect GrowDesk Capture first (click the GrowDesk logo or Connect)'}
          >
            {busy ? <span className="gd-spinner" aria-hidden="true" /> : <PlayIcon />}
            START
          </button>
        )}
      </div>

      {openField && open && active && bundle && (
        <Picker
          field={openField}
          bundle={bundle}
          value={session?.values[openField.key]}
          anchor={open.el.getBoundingClientRect()}
          anchorEl={open.el}
          onChange={(v) => props.onSetValue(openField.key, v)}
          onClose={close}
          onDraw={() => {
            close();
            props.onDraw(openField.key);
          }}
        />
      )}
    </div>
  );
}

function Chip({
  field,
  bundle,
  value,
  active,
  expanded,
  error,
  onClick,
}: {
  field: ConfigField;
  bundle: ConfigBundle;
  value: FieldValue | undefined;
  active: boolean;
  expanded: boolean;
  error: boolean;
  onClick: (el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const set = active && hasValue(value);
  const text = set ? displayValue(field, value, bundle) : '';
  const picks = fieldKind(field) !== 'highlight';

  return (
    <button
      ref={ref}
      type="button"
      className={['gd-chip', set && 'gd-chip--set', error && 'gd-chip--error', !active && 'gd-chip--idle'].filter(Boolean).join(' ')}
      aria-expanded={active ? expanded : undefined}
      aria-haspopup={active ? 'dialog' : undefined}
      disabled={!active}
      title={set ? `${field.label}: ${text}` : `${field.label}${field.required ? ' (required)' : ''}`}
      onClick={() => ref.current && onClick(ref.current)}
    >
      <span className="gd-mark" aria-hidden="true">
        {set && <CheckIcon />}
      </span>
      {field.label}
      {field.required && !set && <span className="gd-req" aria-hidden="true">*</span>}
      {set && <span className="gd-value">{text}</span>}
      {picks && active && (
        <span className="gd-caret" aria-hidden="true">
          <CaretIcon />
        </span>
      )}
    </button>
  );
}
