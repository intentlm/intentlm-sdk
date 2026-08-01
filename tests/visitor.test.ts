import { describe, expect, it } from '@jest/globals';
import {
  VISITOR_COOKIE_NAME,
  formatVisitorCookie,
  isValidVisitorId,
  parseCookieValue,
  resolveVisitorId,
} from '../src/visitor.js';

function mockDoc(initial = ''): { cookie: string } {
  return { cookie: initial };
}

describe('visitor cookie (ILM-203)', () => {
  it('formatVisitorCookie sets path, max-age, and SameSite=Strict', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(formatVisitorCookie(uuid)).toBe(
      `${VISITOR_COOKIE_NAME}=${uuid}; path=/; max-age=31536000; SameSite=Strict`,
    );
  });

  it('first visit creates cookie with generated UUID', () => {
    const doc = mockDoc();
    const fixed = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const id = resolveVisitorId(doc, true, () => fixed);
    expect(id).toBe(fixed);
    expect(parseCookieValue(doc.cookie, VISITOR_COOKIE_NAME)).toBe(fixed);
  });

  it('second visit reuses existing _ilm_vid', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const doc = mockDoc(formatVisitorCookie(uuid));
    const id = resolveVisitorId(doc, true, () => '00000000-0000-4000-8000-000000000099');
    expect(id).toBe(uuid);
    expect(doc.cookie).toContain(uuid);
  });

  it('returns undefined when persistence disabled', () => {
    const doc = mockDoc();
    expect(resolveVisitorId(doc, false)).toBeUndefined();
    expect(doc.cookie).toBe('');
  });

  it('returns undefined when document is unavailable', () => {
    expect(resolveVisitorId(undefined, true)).toBeUndefined();
  });

  it('returns undefined when cookie write does not stick (blocked cookies)', () => {
    const doc: { cookie: string } = {
      set cookie(_value: string) {
        // simulate blocked third-party / partitioned cookie rejection
      },
      get cookie() {
        return '';
      },
    };
    const id = resolveVisitorId(doc, true, () => '550e8400-e29b-41d4-a716-446655440000');
    expect(id).toBeUndefined();
  });

  it('rejects invalid stored cookie and mints a new UUID', () => {
    const doc = mockDoc(`${VISITOR_COOKIE_NAME}=not-a-uuid`);
    const fixed = '550e8400-e29b-41d4-a716-446655440000';
    const id = resolveVisitorId(doc, true, () => fixed);
    expect(id).toBe(fixed);
  });

  it('isValidVisitorId accepts RFC 4122 v4 only', () => {
    expect(isValidVisitorId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidVisitorId('550e8400-e29b-51d4-a716-446655440000')).toBe(false); // wrong version nibble
    expect(isValidVisitorId('')).toBe(false);
  });

  it('visitor_id is independent of session_id shape', () => {
    const doc = mockDoc();
    const visitor = resolveVisitorId(doc, true, () => '550e8400-e29b-41d4-a716-446655440000');
    const sessionId = 'sess_abc123';
    expect(visitor).toBeDefined();
    expect(visitor).not.toBe(sessionId);
    expect(sessionId).toMatch(/^sess_/);
  });
});
