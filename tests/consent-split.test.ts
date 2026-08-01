/** @jest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { IntentLMSDK } from '../src/intentlm';
import { VISITOR_COOKIE_NAME, formatVisitorCookie } from '../src/visitor';

const DEBOUNCE_MS = 250;

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('visitor persistence vs analytics consent', () => {
  let sdk: IntentLMSDK;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    sdk = new IntentLMSDK();
    sessionStorage.clear();
    document.cookie = '';
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: 'UPGRADE_SEEKING',
        confidence: 0.8,
        model_tier: 'markov',
        trigger_nudge: false,
        suppressed: false,
        request_id: 'req',
        session_id: 'sess',
      }),
    }) as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sets _ilm_vid when analytics consent is granted', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      consentCheck: () => true,
      visitorPersistenceConsentCheck: () => false,
    });

    document.cookie = formatVisitorCookie(uuid);
    sdk.refreshVisitorIdentity();

    expect(sdk.getVisitorId()).toBe(uuid);
  });

  it('sends visitor_id on analyze when analytics consent is granted', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440001';
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      consentCheck: () => true,
    });

    document.cookie = formatVisitorCookie(uuid);
    sdk.refreshVisitorIdentity();

    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flushPromises();
    fetchMock.mockClear();

    sdk.capture('PRICING_VIEW');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flushPromises();

    expect(sdk.getVisitorId()).toBe(uuid);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.visitor_id).toBe(uuid);
  });

  it('skips token capture and _ilm_vid when analytics consent is denied', async () => {
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      consentCheck: () => false,
    });

    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flushPromises();
    fetchMock.mockClear();

    sdk.capture('PRICING_VIEW');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flushPromises();

    const analyzeCalls = fetchMock.mock.calls.filter(
      (call) => String(call[0]).includes('/analyze'),
    );
    expect(analyzeCalls).toHaveLength(0);
    expect(sdk.getVisitorId()).toBeUndefined();
  });

  it('opts out of _ilm_vid when enableVisitorPersistence is false', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440002';
    document.cookie = formatVisitorCookie(uuid);

    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      enableVisitorPersistence: false,
      consentCheck: () => true,
    });

    expect(sdk.getVisitorId()).toBeUndefined();
  });

  it('defaults enableVisitorPersistence to true when analytics is granted', () => {
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      consentCheck: () => false,
    });

    expect(sdk.getVisitorId()).toBeUndefined();

    const uuid = '550e8400-e29b-41d4-a716-446655440003';
    document.cookie = formatVisitorCookie(uuid);

    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      consentCheck: () => true,
    });

    expect(sdk.getVisitorId()).toBe(uuid);
    expect(document.cookie).toContain(`${VISITOR_COOKIE_NAME}=${uuid}`);
  });

  it('warns when consentCheck returns false, then again every 25 denials', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    let denials = 0;
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      consentCheck: () => {
        denials += 1;
        return false;
      },
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('consentCheck() returned false'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('consent migrate'),
    );
    warn.mockClear();

    // init already consumed several denials; keep capturing until the next % 25 boundary
    while (denials % 25 !== 24) {
      sdk.capture('PRICING_VIEW');
      if (denials > 200) break;
    }
    expect(warn).not.toHaveBeenCalled();
    sdk.capture('PRICING_VIEW');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('consentCheck() returned false'),
    );
    warn.mockRestore();
  });
});
