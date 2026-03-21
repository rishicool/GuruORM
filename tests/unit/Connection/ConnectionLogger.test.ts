import { describe, it, expect } from '@jest/globals';
import { ConnectionLogger } from '../../../src/Connection/Connection';

describe('Connection / ConnectionLogger', () => {

  describe('debug', () => {
    it('delegates to custom handler', () => {
      const messages: string[] = [];
      const logger = new ConnectionLogger({ debug: (m: string) => messages.push(m) });

      logger.debug('test message');
      expect(messages).toEqual(['test message']);
    });

    it('falls back to console.log', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const logger = new ConnectionLogger();

      logger.debug('fallback');
      expect(spy).toHaveBeenCalledWith('fallback');

      spy.mockRestore();
    });
  });

  describe('warn', () => {
    it('delegates to custom handler', () => {
      const messages: string[] = [];
      const logger = new ConnectionLogger({ warn: (m: string) => messages.push(m) });

      logger.warn('warning');
      expect(messages).toEqual(['warning']);
    });

    it('falls back to console.warn', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const logger = new ConnectionLogger();

      logger.warn('fallback warn');
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('error', () => {
    it('delegates to custom handler', () => {
      const messages: string[] = [];
      const logger = new ConnectionLogger({ error: (m: string) => messages.push(m) });

      logger.error('err');
      expect(messages).toEqual(['err']);
    });

    it('falls back to console.error', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const logger = new ConnectionLogger();

      logger.error('fallback error');
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('deprecate', () => {
    it('delegates to custom handler', () => {
      const calls: [string, string][] = [];
      const logger = new ConnectionLogger({
        deprecate: (method: string, alt: string) => calls.push([method, alt]),
      });

      logger.deprecate('oldMethod', 'newMethod');
      expect(calls).toEqual([['oldMethod', 'newMethod']]);
    });

    it('falls back to warn with deprecation message', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const logger = new ConnectionLogger();

      logger.deprecate('oldFn', 'newFn');
      expect(spy).toHaveBeenCalled();
      const msg = spy.mock.calls[0][0];
      expect(msg).toContain('oldFn');
      expect(msg).toContain('newFn');
      expect(msg).toContain('deprecated');

      spy.mockRestore();
    });
  });

  describe('constructor defaults', () => {
    it('creates without config', () => {
      const logger = new ConnectionLogger();
      expect(logger).toBeDefined();
    });

    it('creates with empty config', () => {
      const logger = new ConnectionLogger({});
      expect(logger).toBeDefined();
    });
  });
});
