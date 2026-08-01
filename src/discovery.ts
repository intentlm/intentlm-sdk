/**
 * Setup-only discovery: record setView emissions and unmapped modals.
 * No raw URLs or user text are sent — opaque ids only.
 */

export type DiscoveryEventKind = 'view' | 'modal';

export interface DiscoveryEvent {
  kind: DiscoveryEventKind;
  id: string;
  ts: number;
}

export interface DiscoveryReporter {
  report: (events: DiscoveryEvent[]) => void;
}

/** Slug for modal fingerprint (aria-label or dialog index — not free-form body text). */
export function modalDiscoveryId(el: Element, index: number): string {
  const label = el.getAttribute('aria-label')?.trim().toLowerCase();
  if (label) {
    const slug = label.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
    if (slug) return `modal.${slug}`;
  }
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy && typeof document !== 'undefined') {
    const ref = document.getElementById(labelledBy);
    const text = ref?.textContent?.trim().toLowerCase().slice(0, 40);
    if (text) {
      const slug = text.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (slug) return `modal.${slug}`;
    }
  }
  return `modal.dialog-${index}`;
}

export function attachModalDiscovery(
  onModal: (id: string) => void,
  consentCheck: () => boolean,
): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const seen = new Set<string>();
  let dialogIndex = 0;

  const scan = () => {
    if (!consentCheck()) return;
    const dialogs = document.querySelectorAll(
      'dialog[open], [role="dialog"], [role="alertdialog"], [data-ilm-modal]',
    );
    dialogs.forEach((el) => {
      const id = modalDiscoveryId(el, dialogIndex++);
      if (seen.has(id)) return;
      seen.add(id);
      onModal(id);
    });
  };

  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'role', 'aria-hidden', 'class'],
  });
  scan();

  return () => observer.disconnect();
}

export function stateViewId(screen: string): string {
  const clean = screen.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return clean.startsWith('view.') ? clean : `view.${clean || 'unknown'}`;
}
