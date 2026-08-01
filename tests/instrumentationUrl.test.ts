import { instrumentationUrl } from '../src/remoteConfig';

describe('instrumentationUrl', () => {
  it('builds proxy path', () => {
    expect(instrumentationUrl('/api/intentlm')).toBe('/api/intentlm/sdk/instrumentation');
  });

  it('builds absolute config url', () => {
    expect(instrumentationUrl('https://config.intentlm.dev')).toBe(
      'https://config.intentlm.dev/v1/sdk/instrumentation',
    );
  });
});
