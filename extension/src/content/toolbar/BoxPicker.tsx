import { useEffect, useRef, useState } from 'react';
import type { ConfigField } from '../../types/growdesk';
import { MAX_BOX_TEXT, textInBox, type Box } from '../regionText';

export interface BoxPickerProps {
  /** The field chosen from its chip; null means choose after drawing. */
  field: ConfigField | null;
  /** Text fields the drawn text can be given to (for the menu after drawing). */
  fields: ConfigField[];
  /** Our own toolbar, never read. */
  skip: Node | null;
  onCapture: (field: ConfigField, text: string) => void;
  onCancel: (message?: string) => void;
}

const MIN_SIZE = 6;
const MENU_W = 240;

/**
 * "Draw a box": the page dims, the user drags a rectangle around the text they want, and the
 * words inside it are captured. Then either straight into the chosen field, or via a small
 * "Set as …" menu next to the box, like the right-click menu.
 */
export function BoxPicker({ field, fields, skip, onCapture, onCancel }: BoxPickerProps) {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [result, setResult] = useState<{ box: Box; text: string } | null>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const finish = (b: Box) => {
    if (b.right - b.left < MIN_SIZE || b.bottom - b.top < MIN_SIZE) {
      setBox(null);
      return;
    }
    const text = textInBox(b, document, skip);
    if (!text) {
      onCancel('No text inside that box. Draw it around the name or number.');
      return;
    }
    if (text.length > MAX_BOX_TEXT) {
      onCancel('That box holds too much text. Draw a smaller box around just the name or number.');
      return;
    }
    if (field) onCapture(field, text);
    else setResult({ box: b, text });
  };

  const drawn = result?.box ?? box;
  const menuLeft = result ? Math.max(8, Math.min(result.box.left, window.innerWidth - MENU_W - 8)) : 0;
  const menuTop = result ? Math.min(result.box.bottom + 8, window.innerHeight - 60 - fields.length * 34) : 0;

  return (
    <div
      ref={overlay}
      className={`gd-draw${result ? ' gd-draw--done' : ''}`}
      onMouseDown={(e) => {
        if (result || e.button !== 0) return;
        e.preventDefault();
        setStart({ x: e.clientX, y: e.clientY });
        setBox({ left: e.clientX, top: e.clientY, right: e.clientX, bottom: e.clientY });
      }}
      onMouseMove={(e) => {
        if (!start || result) return;
        setBox({
          left: Math.min(start.x, e.clientX),
          top: Math.min(start.y, e.clientY),
          right: Math.max(start.x, e.clientX),
          bottom: Math.max(start.y, e.clientY),
        });
      }}
      onMouseUp={() => {
        if (!start || !box || result) return;
        setStart(null);
        finish(box);
      }}
    >
      {!drawn && (
        <div className="gd-draw-hint">
          Drag a box around the {field ? field.label.toLowerCase() : 'name or number'}. <kbd>Esc</kbd> cancels.
        </div>
      )}
      {drawn && (
        <div className="gd-draw-box" style={{ left: drawn.left, top: drawn.top, width: drawn.right - drawn.left, height: drawn.bottom - drawn.top }} />
      )}
      {result && (
        <div className="gd-draw-menu" style={{ left: menuLeft, top: menuTop }} role="menu" onMouseDown={(e) => e.stopPropagation()}>
          <p className="gd-draw-preview" title={result.text}>
            “{result.text}”
          </p>
          {fields.map((f) => (
            <button key={f.key} type="button" role="menuitem" className="gd-draw-item" onClick={() => onCapture(f, result.text)}>
              {f.type === 'textarea' ? `Add to ${f.label}` : `Set as ${f.label}`}
            </button>
          ))}
          <button type="button" role="menuitem" className="gd-draw-item gd-draw-item--muted" onClick={() => onCancel()}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
