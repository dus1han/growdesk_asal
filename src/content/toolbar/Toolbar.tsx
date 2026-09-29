import { canSave, type CaptureSession, type Platform } from '../../types/capture';

export interface FlashMessage {
  text: string;
  tone: 'success' | 'error' | 'hint';
}

export interface ToolbarProps {
  session: CaptureSession | null;
  platform: Platform;
  flash: FlashMessage | null;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
}

interface FieldProps {
  label: string;
  value?: string;
}

function Field({ label, value }: FieldProps) {
  const isSet = Boolean(value?.trim());
  return (
    <span
      className={`crm-field${isSet ? ' crm-field--set' : ''}`}
      title={isSet ? `${label}: ${value}` : `${label} not captured`}
    >
      <span className="crm-mark" aria-hidden="true">
        {isSet ? '\u2713' : '\u25CB'}
      </span>
      {label}
      {isSet ? <span className="crm-value">{value}</span> : null}
    </span>
  );
}

export function Toolbar({ session, platform, flash, busy, onStart, onStop }: ToolbarProps) {
  const active = Boolean(session?.active);
  const saveAllowed = canSave(session);

  // While active but not yet saveable, the toolbar permanently explains why
  // STOP is unavailable. Transient flash messages take priority over it.
  const hint = active && !saveAllowed ? 'Capture a Number or Insta Name before saving.' : '';
  const statusText = flash?.text ?? hint;
  const statusTone = flash?.tone ?? (hint ? 'hint' : null);

  return (
    <div className="crm-bar" role="toolbar" aria-label="CRM Capture">
      <span className="crm-brand">CRM Capture</span>
      <span className="crm-divider" aria-hidden="true" />

      {active ? (
        <span className="crm-chip crm-chip--active">
          <span className="crm-dot" aria-hidden="true" />
          ACTIVE
        </span>
      ) : (
        <span className="crm-chip">{platform}</span>
      )}

      <span className="crm-divider" aria-hidden="true" />

      <span className="crm-fields">
        <Field label="Name" value={session?.name} />
        <Field label="Number" value={session?.number} />
        <Field label="Insta" value={session?.instagramName} />
      </span>

      <span className="crm-divider" aria-hidden="true" />

      <span
        className={`crm-status${statusTone ? ` crm-status--${statusTone}` : ''}`}
        role="status"
        aria-live="polite"
      >
        {statusText}
      </span>

      {active ? (
        <button
          type="button"
          className="crm-btn crm-btn--stop"
          onClick={onStop}
          disabled={!saveAllowed || busy}
          title={
            saveAllowed
              ? 'Stop capture and save the TXT file'
              : 'Capture a Number or Insta Name before saving.'
          }
        >
          STOP
        </button>
      ) : (
        <button type="button" className="crm-btn" onClick={onStart} disabled={busy}>
          START
        </button>
      )}
    </div>
  );
}
