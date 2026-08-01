/**
 * Layer 3: declarative semantic events via data-ilm-event on clickable elements.
 * Only taxonomy labels are emitted — no DOM text leaves the browser.
 */

import type { IntentLabel } from './taxonomy.js';
import { TOKEN_BY_LABEL } from './taxonomy.js';

const EVENT_ATTR = 'data-ilm-event';
const IGNORE_ATTR = 'data-ilm-ignore';

export function attachSemanticCapture(
  onCapture: (label: IntentLabel) => void,
  consentCheck: () => boolean,
): () => void {
  if (typeof document === 'undefined') return () => {};

  const handler = (event: MouseEvent) => {
    if (!consentCheck()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const el = target.closest(`[${EVENT_ATTR}]`);
    if (!el || el.closest(`[${IGNORE_ATTR}]`)) return;

    const raw = el.getAttribute(EVENT_ATTR)?.trim();
    if (!raw) return;

    if (!(raw in TOKEN_BY_LABEL)) {
      console.warn(`[intentLM] Unknown data-ilm-event label: "${raw}"`);
      return;
    }
    onCapture(raw as IntentLabel);
  };

  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
