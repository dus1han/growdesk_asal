import { useEffect, useState } from 'react';
import type { ConfigField } from '../../types/growdesk';
import { MAX_BOX_TEXT, textInBox, type Box } from '../regionText';

export interface BoxPickerProps {
  /** The field chosen from its chip ("Draw a box around it"). */
  field: ConfigField;
  /** Our own toolbar, never read. */
  skip: Node | null;
  onCapture: (field: ConfigField, text: string) => void;
  onCancel: (message?: string) => void;
}

const MIN_SIZE = 6;

/**
 * "Draw a box around it": the page dims, the user drags a rectangle around the text, and the
 * words inside it go into the field chosen from its chip. Works on text the site doesn't let you
 * highlight, such as the name and number in WhatsApp's Contact info.
 */
export function BoxPicker({ field, skip, onCapture, onCancel }: BoxPickerProps) {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);

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
    if (!text) onCancel(`No text inside that box. Draw it around the ${field.label.toLowerCase()}.`);
    else if (text.length > MAX_BOX_TEXT) onCancel(`That box holds too much text. Draw a smaller box around just the ${field.label.toLowerCase()}.`);
    else onCapture(field, text);
  };

  return (
    <div
      className="gd-draw"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setStart({ x: e.clientX, y: e.clientY });
        setBox({ left: e.clientX, top: e.clientY, right: e.clientX, bottom: e.clientY });
      }}
      onMouseMove={(e) => {
        if (!start) return;
        setBox({
          left: Math.min(start.x, e.clientX),
          top: Math.min(start.y, e.clientY),
          right: Math.max(start.x, e.clientX),
          bottom: Math.max(start.y, e.clientY),
        });
      }}
      onMouseUp={() => {
        if (!start || !box) return;
        setStart(null);
        finish(box);
      }}
    >
      {!box && (
        <div className="gd-draw-hint">
          Drag a box around the {field.label.toLowerCase()}. <kbd>Esc</kbd> cancels.
        </div>
      )}
      {box && <div className="gd-draw-box" style={{ left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top }} />}
    </div>
  );
}
