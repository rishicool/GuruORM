import { describe, it, expect, beforeEach } from '@jest/globals';
import { QueryLogger, QueryLog, QueryListener } from '../../../src/Support/QueryLogger';

describe('Support / QueryLogger', () => {

  beforeEach(() => {
    QueryLogger.disable();
    QueryLogger.flushQueryLog();
    QueryLogger.setMaxSize(1000);
  });

  // ── enable / disable / isEnabled ─────────────────────

  describe('enable / disable', () => {
    it('starts disabled', () => {
      expect(QueryLogger.isEnabled()).toBe(false);
    });

    it('enable turns on logging', () => {
      QueryLogger.enable();
      expect(QueryLogger.isEnabled()).toBe(true);
    });

    it('disable turns off logging', () => {
      QueryLogger.enable();
      QueryLogger.disable();
      expect(QueryLogger.isEnabled()).toBe(false);
    });
  });

  // ── log ──────────────────────────────────────────────

  describe('log', () => {
    it('does nothing when disabled', () => {
      QueryLogger.log('SELECT 1');
      expect(QueryLogger.getQueryCount()).toBe(0);
    });

    it('records query when enabled', () => {
      QueryLogger.enable();
      QueryLogger.log('SELECT * FROM users', [1], 5.2, 'main');

      const logs = QueryLogger.getQueryLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].sql).toBe('SELECT * FROM users');
      expect(logs[0].bindings).toEqual([1]);
      expect(logs[0].time).toBe(5.2);
      expect(logs[0].connection).toBe('main');
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('defaults connection to "default"', () => {
      QueryLogger.enable();
      QueryLogger.log('SELECT 1');
      expect(QueryLogger.getQueryLog()[0].connection).toBe('default');
    });

    it('defaults bindings to empty array', () => {
      QueryLogger.enable();
      QueryLogger.log('SELECT 1');
      expect(QueryLogger.getQueryLog()[0].bindings).toEqual([]);
    });
  });

  // ── maxSize ring buffer ──────────────────────────────

  describe('maxSize', () => {
    it('defaults to 1000', () => {
      expect(QueryLogger.getMaxSize()).toBe(1000);
    });

    it('evicts oldest entry when at capacity', () => {
      QueryLogger.enable();
      QueryLogger.setMaxSize(2);
      QueryLogger.log('Q1');
      QueryLogger.log('Q2');
      QueryLogger.log('Q3');

      const logs = QueryLogger.getQueryLog();
      expect(logs).toHaveLength(2);
      expect(logs[0].sql).toBe('Q2');
      expect(logs[1].sql).toBe('Q3');
    });

    it('trims existing log when size reduced', () => {
      QueryLogger.enable();
      QueryLogger.log('Q1');
      QueryLogger.log('Q2');
      QueryLogger.log('Q3');

      QueryLogger.setMaxSize(1);
      expect(QueryLogger.getQueryLog()).toHaveLength(1);
      expect(QueryLogger.getQueryLog()[0].sql).toBe('Q3');
    });

    it('enforces minimum size of 1', () => {
      QueryLogger.setMaxSize(0);
      expect(QueryLogger.getMaxSize()).toBe(1);
    });
  });

  // ── getQueryLog / flushQueryLog ──────────────────────

  describe('getQueryLog', () => {
    it('returns a copy (not a reference)', () => {
      QueryLogger.enable();
      QueryLogger.log('SELECT 1');

      const logs = QueryLogger.getQueryLog();
      logs.pop();
      expect(QueryLogger.getQueryLog()).toHaveLength(1);
    });
  });

  describe('flushQueryLog', () => {
    it('clears all logged queries', () => {
      QueryLogger.enable();
      QueryLogger.log('Q1');
      QueryLogger.log('Q2');

      QueryLogger.flushQueryLog();
      expect(QueryLogger.getQueryCount()).toBe(0);
    });
  });

  // ── listeners ────────────────────────────────────────

  describe('listen / removeListener', () => {
    it('calls listener for each logged query', () => {
      const received: QueryLog[] = [];
      const listener: QueryListener = (q) => received.push(q);

      QueryLogger.listen(listener);
      QueryLogger.enable();
      QueryLogger.log('Q1');

      expect(received).toHaveLength(1);
      expect(received[0].sql).toBe('Q1');

      QueryLogger.removeListener(listener);
    });

    it('removeListener stops notifications', () => {
      const received: QueryLog[] = [];
      const listener: QueryListener = (q) => received.push(q);

      QueryLogger.listen(listener);
      QueryLogger.enable();
      QueryLogger.log('Q1');
      QueryLogger.removeListener(listener);
      QueryLogger.log('Q2');

      expect(received).toHaveLength(1);
    });

    it('survives listener errors', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const bad: QueryListener = () => { throw new Error('boom'); };

      QueryLogger.listen(bad);
      QueryLogger.enable();
      QueryLogger.log('Q1');

      // Query is still recorded
      expect(QueryLogger.getQueryCount()).toBe(1);
      expect(spy).toHaveBeenCalled();

      QueryLogger.removeListener(bad);
      spy.mockRestore();
    });
  });

  // ── analytics ────────────────────────────────────────

  describe('getTotalTime', () => {
    it('sums all query times', () => {
      QueryLogger.enable();
      QueryLogger.log('Q1', [], 10);
      QueryLogger.log('Q2', [], 20);
      expect(QueryLogger.getTotalTime()).toBe(30);
    });
  });

  describe('getQueryCount', () => {
    it('returns number of logged queries', () => {
      QueryLogger.enable();
      QueryLogger.log('Q1');
      QueryLogger.log('Q2');
      expect(QueryLogger.getQueryCount()).toBe(2);
    });
  });

  describe('getSlowQueries', () => {
    it('returns queries above threshold', () => {
      QueryLogger.enable();
      QueryLogger.log('fast', [], 10);
      QueryLogger.log('slow', [], 200);
      QueryLogger.log('medium', [], 50);

      const slow = QueryLogger.getSlowQueries(100);
      expect(slow).toHaveLength(1);
      expect(slow[0].sql).toBe('slow');
    });

    it('defaults threshold to 100ms', () => {
      QueryLogger.enable();
      QueryLogger.log('Q', [], 101);

      expect(QueryLogger.getSlowQueries()).toHaveLength(1);
    });
  });

  // ── prettyPrint ──────────────────────────────────────

  describe('prettyPrint', () => {
    it('logs to console without throwing', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      QueryLogger.enable();
      QueryLogger.log('SELECT * FROM users WHERE id = ?', [1], 5);
      QueryLogger.prettyPrint();

      expect(spy).toHaveBeenCalled();
      // Should print query count, total time, SQL, bindings, time, connection
      const allOutput = spy.mock.calls.map(c => c[0]).join(' ');
      expect(allOutput).toContain('Query Log');
      spy.mockRestore();
    });

    it('prints bindings if they exist', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      QueryLogger.enable();
      QueryLogger.log('SELECT ?', ['test'], 2.5);
      QueryLogger.prettyPrint();

      const allOutput = spy.mock.calls.map(c => c[0]).join(' ');
      expect(allOutput).toContain('Bindings');
      spy.mockRestore();
    });

    it('prints empty log with no queries', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      QueryLogger.enable();
      QueryLogger.prettyPrint();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
