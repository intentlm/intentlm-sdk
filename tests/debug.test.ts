import { describe, expect, it, jest } from '@jest/globals';
import { logSdkDebug, logSdkError } from '../src/debug.js';

describe('SDK debug logging', () => {
  it('logSdkDebug is silent when debug is false', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    logSdkDebug(false, 'hidden');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logSdkDebug prints when debug is true', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    logSdkDebug(true, 'visible', { ok: true });
    expect(spy).toHaveBeenCalledWith('[intentLM] visible', { ok: true });
    spy.mockRestore();
  });

  it('logSdkError prints when debug is true', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSdkError(true, 'network failure');
    expect(spy).toHaveBeenCalledWith('[intentLM] network failure');
    spy.mockRestore();
  });
});
