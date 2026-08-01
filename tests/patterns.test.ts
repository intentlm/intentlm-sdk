/**
 * Tests for patternToRegex / case normalization (mirrors sdk/src/patterns.ts).
 */

import { patternToRegex, normalizeUrlPath } from '../src/patterns';

describe('patternToRegex', () => {
  it('matches exact path', () => {
    const r = patternToRegex('/pricing');
    expect(r.test('/pricing')).toBe(true);
    expect(r.test('/pricing-page')).toBe(false);
  });

  it('matches single wildcard within segment', () => {
    const r = patternToRegex('/pricing*');
    expect(r.test('/pricing')).toBe(true);
    expect(r.test('/pricing-annual')).toBe(true);
    expect(r.test('/pricing?plan=pro')).toBe(true);
    expect(r.test('/pricing/details')).toBe(false);
  });

  it('matches deep wildcard across segments', () => {
    const r = patternToRegex('/docs/**');
    expect(r.test('/docs/api/reference/tokens')).toBe(true);
    expect(r.test('/docs')).toBe(false);
  });

  it('matches named path parameter', () => {
    const r = patternToRegex('/users/:id/edit');
    expect(r.test('/users/8472/edit')).toBe(true);
    expect(r.test('/users/edit')).toBe(false);
  });

  it('preserves query string in match', () => {
    const r = patternToRegex('/checkout');
    expect(r.test('/checkout?plan=pro')).toBe(true);
  });

  it('treats /Booking* and /booking as the same (case-normalized)', () => {
    const r = patternToRegex('/Booking*');
    expect(r.test(normalizeUrlPath('/booking'))).toBe(true);
    expect(r.test(normalizeUrlPath('/Booking'))).toBe(true);
    expect(patternToRegex('/booking*').test(normalizeUrlPath('/Booking'))).toBe(true);
  });
});
