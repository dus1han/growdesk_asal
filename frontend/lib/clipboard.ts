/**
 * Copies text to the clipboard. Browsers only offer the Clipboard API on secure pages (https or
 * localhost); GrowDesk on plain http falls back to the older copy command.
 *
 * `from` is the element that asked (e.g. the copy button): the temporary text box goes next to
 * it, so a dialog that keeps focus inside itself doesn't cancel the selection.
 */
export async function copyText(text: string, from?: HTMLElement | null): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the older method.
    }
  }

  const container = from?.closest<HTMLElement>('[role="dialog"]') ?? document.body;
  const box = document.createElement("textarea");
  box.value = text;
  box.setAttribute("readonly", "");
  box.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
  container.appendChild(box);
  box.focus();
  box.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  box.remove();
  from?.focus();
  return copied;
}
