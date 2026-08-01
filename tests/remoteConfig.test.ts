import { mergeRemoteConfig } from '../src/remoteConfig';

describe('mergeRemoteConfig', () => {
  it('prefers remote patterns and views', () => {
    const merged = mergeRemoteConfig(
      {
        patterns: { '/': 101 },
        views: {},
        apiKey: 'k',
      } as never,
      {
        version: 'p2:v1',
        patterns: { '/pricing*': 102 },
        views: { 'app.dash': 805 },
        route_views: { '/app/*': 'app.dash' },
      },
    );
    expect(merged.patterns).toEqual({ '/pricing*': 102 });
    expect(merged.views).toEqual({ 'app.dash': 805 });
    expect(merged.routeViews).toEqual({ '/app/*': 'app.dash' });
  });

  it('merges enable_visitor_persistence from remote instrumentation', () => {
    const merged = mergeRemoteConfig(
      { patterns: { '/': 101 }, enableVisitorPersistence: false } as never,
      {
        version: 'p1:v0',
        patterns: {},
        views: {},
        route_views: {},
        enable_visitor_persistence: true,
      },
    );
    expect(merged.enableVisitorPersistence).toBe(true);
  });

  it('merges local_tokens from remote instrumentation', () => {
    const merged = mergeRemoteConfig(
      { patterns: { '/': 101 }, apiKey: 'k' } as never,
      {
        version: 'p1:v0',
        patterns: { '/docs/**': 1 },
        views: {},
        route_views: {},
        local_tokens: { 1: 'DOCS_VIEW.1' },
      },
    );
    expect(merged.localTokens).toEqual({ 1: 'DOCS_VIEW.1' });
  });

  it('merges local_token_display aliases from remote instrumentation', () => {
    const merged = mergeRemoteConfig(
      { patterns: { '/': 101 }, apiKey: 'k' } as never,
      {
        version: 'p1:v0',
        patterns: { '/': 1 },
        views: {},
        route_views: {},
        local_tokens: { 1: 'HOMEPAGE_VIEW.1' },
        local_token_display: { 1: 'HOMEPAGE_VIEW_SMB' },
      },
    );
    expect(merged.localTokens).toEqual({ 1: 'HOMEPAGE_VIEW.1' });
    expect(merged.localTokenDisplay).toEqual({ 1: 'HOMEPAGE_VIEW_SMB' });
  });

  it('merges inference_endpoint from remote instrumentation', () => {
    const merged = mergeRemoteConfig(
      {
        patterns: { '/': 101 },
        endpoint: 'https://api.intentlm.dev/v1',
        apiKey: 'k',
      } as never,
      {
        version: 'p1:v0',
        patterns: {},
        views: {},
        route_views: {},
        inference_endpoint: 'https://intentlm-dev-inference-krxe5fa7dq-uw.a.run.app/v1',
      },
    );
    expect(merged.endpoint).toBe(
      'https://intentlm-dev-inference-krxe5fa7dq-uw.a.run.app/v1',
    );
  });
});
