/** @jest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { IntentLMSDK, type IntentAnalyzeUpdate } from '../src/intentlm';

const DEBOUNCE_MS = 250;

function analyzeResponse(intent: string, confidence = 0.85) {
  return {
    intent,
    confidence,
    model_tier: 'markov' as const,
    trigger_nudge: false,
    suppressed: false,
    request_id: 'req_test',
    session_id: 'sess_test',
  };
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

async function settleFetch(resolver: (value: unknown) => void, payload: unknown): Promise<void> {
  jest.useRealTimers();
  resolver(payload);
  await flushPromises();
  jest.useFakeTimers();
}

describe('IntentLMSDK analyze debounce + stale guard', () => {
  let sdk: IntentLMSDK;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let onAnalyze: jest.Mock<(update: IntentAnalyzeUpdate) => void>;

  beforeEach(async () => {
    jest.useFakeTimers();
    sdk = new IntentLMSDK();
    onAnalyze = jest.fn();
    sessionStorage.clear();
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => analyzeResponse('UPGRADE_SEEKING'),
    }) as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      trackBehavior: false,
      onAnalyze,
    });

    jest.advanceTimersByTime(DEBOUNCE_MS);
    await flushPromises();
    onAnalyze.mockClear();
    fetchMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('debounces rapid token bursts into one analyze call', () => {
    sdk.capture('PRICING_VIEW');
    sdk.capture('UPGRADE_CTA_CLICK');
    sdk.capture('FEATURE_GATE_HIT');

    expect(fetchMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.tokens.length).toBeGreaterThanOrEqual(3);
  });

  it('discards stale analyze responses when tokens advanced during flight', async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    fetchMock.mockImplementation(() =>
      new Promise((resolve) => {
        resolvers.push((payload) =>
          resolve({
            ok: true,
            json: async () => payload,
          }),
        );
      }),
    );

    sdk.capture('PRICING_VIEW');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(resolvers).toHaveLength(1);

    sdk.capture('UPGRADE_CTA_CLICK');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await settleFetch(resolvers[0]!, analyzeResponse('CHURN_SIGNAL_DETECTED', 0.99));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await settleFetch(resolvers[1]!, analyzeResponse('UPGRADE_SEEKING', 0.92));

    const completed = onAnalyze.mock.calls.filter((c) => !c[0].isAnalyzing && c[0].intent);
    expect(completed).toHaveLength(1);
    expect(completed[0][0].intent).toBe('UPGRADE_SEEKING');
    expect(completed[0][0].confidence).toBe(0.92);
  });

  it('runs a follow-up analyze when tokens arrive during an in-flight request', async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    fetchMock.mockImplementation(() =>
      new Promise((resolve) => {
        resolvers.push((payload) =>
          resolve({
            ok: true,
            json: async () => payload,
          }),
        );
      }),
    );

    sdk.capture('PRICING_VIEW');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    sdk.capture('UPGRADE_CTA_CLICK');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await settleFetch(resolvers[0]!, analyzeResponse('PRICING_VIEW', 0.5));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await settleFetch(resolvers[1]!, analyzeResponse('UPGRADE_SEEKING', 0.88));

    const completed = onAnalyze.mock.calls.filter((c) => !c[0].isAnalyzing && c[0].intent);
    expect(completed[completed.length - 1][0].intent).toBe('UPGRADE_SEEKING');
  });

  it('does not emit stale intent after a newer analyze result was applied', async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    fetchMock.mockImplementation(() =>
      new Promise((resolve) => {
        resolvers.push((payload) =>
          resolve({
            ok: true,
            json: async () => payload,
          }),
        );
      }),
    );

    sdk.capture('PRICING_VIEW');
    jest.advanceTimersByTime(DEBOUNCE_MS);

    sdk.capture('UPGRADE_CTA_CLICK');
    jest.advanceTimersByTime(DEBOUNCE_MS);

    await settleFetch(resolvers[0]!, analyzeResponse('CHURN_SIGNAL_DETECTED', 0.99));
    expect(onAnalyze.mock.calls.some((c) => c[0].intent === 'CHURN_SIGNAL_DETECTED')).toBe(false);

    await settleFetch(resolvers[1]!, analyzeResponse('UPGRADE_SEEKING', 0.9));

    const intents = onAnalyze.mock.calls
      .filter((c) => !c[0].isAnalyzing && c[0].intent)
      .map((c) => c[0].intent);
    expect(intents).toEqual(['UPGRADE_SEEKING']);
  });
});
