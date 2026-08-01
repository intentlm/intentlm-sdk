/** @jest-environment jsdom */

import { isFormFieldElement, isPaymentLikeField } from '../src/formEngagement';

describe('formEngagement', () => {
  test('isFormFieldElement matches inputs', () => {
    const input = document.createElement('input');
    expect(isFormFieldElement(input)).toBe(true);
  });

  test('isFormFieldElement matches data-ilm-form-field', () => {
    const div = document.createElement('div');
    div.setAttribute('data-ilm-form-field', '');
    expect(isFormFieldElement(div)).toBe(true);
  });

  test('isPaymentLikeField detects cc-number autocomplete', () => {
    const input = document.createElement('input');
    input.autocomplete = 'cc-number';
    expect(isPaymentLikeField(input)).toBe(true);
  });

  test('isPaymentLikeField detects data-ilm-payment-field', () => {
    const div = document.createElement('div');
    div.setAttribute('data-ilm-payment-field', '');
    expect(isPaymentLikeField(div)).toBe(true);
  });
});
