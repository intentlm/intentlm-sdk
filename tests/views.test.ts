/** @jest-environment jsdom */

import { IntentLMSDK } from '../src/intentlm';

describe('IntentLMSDK views', () => {
  let sdk: IntentLMSDK;

  beforeEach(() => {
    sdk = new IntentLMSDK();
    sessionStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: null,
        confidence: 0,
        model_tier: 'markov',
        trigger_nudge: false,
        suppressed: false,
        request_id: 'req_test',
        session_id: 'sess_test',
      }),
    }) as typeof fetch;
  });

  it('setView emits token once per view change', () => {
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      views: { 'app.dashboard': 805, 'app.settings': 806 },
      debug: true,
    });
    sdk.setView('app.dashboard');
    sdk.setView('app.dashboard');
    sdk.setView('app.settings');
    const coverage = sdk.getViewCoverage();
    expect(coverage.seen).toEqual(['app.dashboard', 'app.settings']);
    expect(sdk.getActiveViewId()).toBe('app.settings');
  });

  it('captureCoreAction uses configured token', () => {
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      coreActionToken: 605,
    });
    sdk.captureCoreAction();
    expect(sdk.getViewCoverage().seen).toEqual([]);
  });

  it('skips unknown view ids when not in config', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    sdk.init({
      apiKey: 'ilm_live_test',
      patterns: { '/': 101 },
      views: {},
      debug: true,
    });
    sdk.setView('missing.view');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
