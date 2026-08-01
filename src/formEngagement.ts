/**
 * Detect form / payment field engagement without reading field values (PCI-safe).
 */

const FORM_FIELD_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-ilm-form-field]';

/** autocomplete tokens that indicate payment card entry (no value access). */
const PAYMENT_AUTOCOMPLETE = /^(cc-|credit|card)/i;

export function isFormFieldElement(target: EventTarget | null): target is HTMLElement {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.matches(FORM_FIELD_SELECTOR)) return true;
  return target.hasAttribute('data-ilm-form-field');
}

export function isPaymentLikeField(el: HTMLElement): boolean {
  if (el.hasAttribute('data-ilm-payment-field')) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  const ac = (el.autocomplete ?? '').toLowerCase();
  return PAYMENT_AUTOCOMPLETE.test(ac);
}
