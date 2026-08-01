/** @jest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { IntentLMSDK } from '../src/intentlm';
import { TOKEN_BY_LABEL } from '../src/taxonomy';

const DEBOUNCE_MS = 250;

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('IntentLMSDK tab visibility + sessionTTL', () => {
  let sdk: IntentLMSDK;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    sdk = new IntentLMSDK();
    sessionStorage.clear();
    setDocumentHidden(false);
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: 'LOW_ENGAGEMENT_SIGNAL',
        confidence: 0.8,
        model_tier: 'markov',
        trigger_nudge: true,
        suppressed: false,
        request_id: 'req_test',
        session_id: 'sess_test',
      }),
    }) as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    sdk.init({
      apiKey: 'ilm_live_test',
      endpoint: 'https://example.test/v1',
      patterns: { '/': 101, '/pricing*': 102 },
      consentCheck: () => true,
      trackBehavior: true,
      debug: false,
    });
    // Clear init-driven analyze (SESSION_STARTED + route)
    jest.advanceTimersByTime(DEBOUNCE_MS);
    fetchMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    setDocumentHidden(false);
  });

  it('defaults sessionTTL to 15 minutes', () => {
    const cfg = (sdk as unknown as { _cfg: { sessionTTL: number } })._cfg;
    expect(cfg.sessionTTL).toBe(15 * 60 * 1000);
  });

  it('records TAB_HIDDEN/TAB_RETURNED but does not schedule analyze', () => {
    setDocumentHidden(true);
    setDocumentHidden(false);

    const seq = (sdk as unknown as { _sequence: number[] })._sequence;
    expect(seq).toContain(TOKEN_BY_LABEL['TAB_HIDDEN']);
    expect(seq).toContain(TOKEN_BY_LABEL['TAB_RETURNED']);

    jest.advanceTimersByTime(DEBOUNCE_MS);
    const analyzeCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/analyze'),
    );
    expect(analyzeCalls).toHaveLength(0);
  });

  it('does not emit idle tokens while hidden or after return until activity', () => {
    setDocumentHidden(true);
    jest.advanceTimersByTime(130_000);
    let seq = (sdk as unknown as { _sequence: number[] })._sequence;
    expect(seq).not.toContain(TOKEN_BY_LABEL['IDLE_DRIFT_30S']);
    expect(seq).not.toContain(TOKEN_BY_LABEL['IDLE_DRIFT_120S']);

    setDocumentHidden(false);
    jest.advanceTimersByTime(130_000);
    seq = (sdk as unknown as { _sequence: number[] })._sequence;
    expect(seq).not.toContain(TOKEN_BY_LABEL['IDLE_DRIFT_30S']);
    expect(seq).not.toContain(TOKEN_BY_LABEL['IDLE_DRIFT_120S']);

    // Real activity resumes idle detection
    document.dispatchEvent(new MouseEvent('mousemove'));
    jest.advanceTimersByTime(30_000);
    seq = (sdk as unknown as { _sequence: number[] })._sequence;
    expect(seq).toContain(TOKEN_BY_LABEL['IDLE_DRIFT_30S']);
  });

  it('records IDLE_DRIFT but does not schedule analyze', () => {
    document.dispatchEvent(new MouseEvent('mousemove'));
    fetchMock.mockClear();
    jest.advanceTimersByTime(30_000);

    const seq = (sdk as unknown as { _sequence: number[] })._sequence;
    expect(seq).toContain(TOKEN_BY_LABEL['IDLE_DRIFT_30S']);

    jest.advanceTimersByTime(DEBOUNCE_MS);
    const analyzeCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/analyze'),
    );
    expect(analyzeCalls).toHaveLength(0);
  });

  it('cancels pending analyze when the tab hides', () => {
    window.history.pushState({}, '', '/pricing');
    // Debounce armed but not fired yet
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/analyze'))).toHaveLength(0);

    setDocumentHidden(true);
    jest.advanceTimersByTime(DEBOUNCE_MS);

    const analyzeCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/analyze'),
    );
    expect(analyzeCalls).toHaveLength(0);
  });

  it('emits at most one TAB_RETURNED per hide cycle', () => {
    setDocumentHidden(true);
    setDocumentHidden(false);
    setDocumentHidden(false); // spurious visible event

    const seq = (sdk as unknown as { _sequence: number[] })._sequence;
    const returned = seq.filter((t) => t === TOKEN_BY_LABEL['TAB_RETURNED']);
    expect(returned).toHaveLength(1);
  });

  it('product navigation after return schedules analyze', () => {
    setDocumentHidden(true);
    setDocumentHidden(false);
    fetchMock.mockClear();

    window.history.pushState({}, '', '/pricing');
    jest.advanceTimersByTime(DEBOUNCE_MS);

    const analyzeCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/analyze'),
    );
    expect(analyzeCalls.length).toBeGreaterThanOrEqual(1);
  });
});
