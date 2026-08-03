/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntentLMSDK, type IntentAnalyzeUpdate } from '../src/intentlm.js';

const DEBOUNCE_MS = 250;

describe('localOnly capture (OSS, no API key)', () => {
  let sdk: IntentLMSDK;

  beforeEach(() => {
    jest.useFakeTimers();
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0]?.trim();
      if (name) document.cookie = `${name}=; max-age=0; path=/`;
    });
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    sdk = new IntentLMSDK();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('init without apiKey throws unless localOnly', () => {
    expect(() =>
      sdk.init({ patterns: { '/': 101, '/pricing*': 102 } }),
    ).toThrow(/apiKey is required/);
  });

  it('captures visitor_id and integer token stream without network', () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    const updates: IntentAnalyzeUpdate[] = [];

    sdk.init({
      localOnly: true,
      patterns: {
        '/': 101,
        '/pricing*': 102,
        '/checkout/**': 203,
      },
      onAnalyze: (u) => updates.push(u),
    });

    // Success checks after init
    const visitorId = sdk.getVisitorId();
    expect(visitorId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(document.cookie).toContain(`_ilm_vid=${visitorId}`);
    expect(sdk.getSessionId()).toMatch(/^sess_/);
    expect(sdk.getSessionTokens()[0]).toBe(910); // SESSION_STARTED
    expect(sdk.getSessionTokens()).toContain(101); // HOME from /

    window.history.pushState({}, '', '/pricing');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(sdk.getSessionTokens()).toContain(102);

    jest.advanceTimersByTime(DEBOUNCE_MS);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updates.length).toBeGreaterThan(0);
    const last = updates[updates.length - 1]!;
    expect(last.visitorId).toBe(visitorId);
    expect(last.sessionTokens).toContain(910);
    expect(last.sessionTokens).toContain(102);
    expect(last.intent).toBeNull(); // no hosted classify in localOnly
  });
});
