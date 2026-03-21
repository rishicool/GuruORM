import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Manager } from '../../../src/Capsule/Manager';

describe('Capsule / Manager', () => {

  // Reset singleton state between tests
  afterEach(() => {
    (Manager as any).instance = null;
  });

  // ── constructor ──────────────────────────────────────

  describe('constructor', () => {
    it('creates instance without errors', () => {
      const mgr = new Manager();
      expect(mgr).toBeInstanceOf(Manager);
    });
  });

  // ── setAsGlobal / getInstance ────────────────────────

  describe('setAsGlobal / getInstance', () => {
    it('makes instance available globally', () => {
      const mgr = new Manager();
      mgr.setAsGlobal();
      expect(Manager.getInstance()).toBe(mgr);
    });

    it('getInstance throws when not set', () => {
      expect(() => Manager.getInstance()).toThrow('Capsule not set as global');
    });
  });

  // ── addConnection ────────────────────────────────────

  describe('addConnection', () => {
    it('registers a named connection', () => {
      const mgr = new Manager();
      mgr.addConnection({
        driver: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'root',
        password: '',
      });

      expect(mgr.getDefaultConnection()).toBe('default');
    });

    it('custom connection name', () => {
      const mgr = new Manager();
      mgr.addConnection({
        driver: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'root',
        password: '',
      }, 'secondary');

      // Should not throw
      expect(mgr).toBeDefined();
    });
  });

  // ── setDefaultConnection / getDefaultConnection ─────

  describe('setDefaultConnection / getDefaultConnection', () => {
    it('sets and gets default connection', () => {
      const mgr = new Manager();
      mgr.setDefaultConnection('replica');
      expect(mgr.getDefaultConnection()).toBe('replica');
    });
  });

  // ── getDatabaseManager ──────────────────────────────

  describe('getDatabaseManager', () => {
    it('returns the underlying ConnectionManager', () => {
      const mgr = new Manager();
      expect(mgr.getDatabaseManager()).toBeDefined();
    });
  });

  // ── static raw ──────────────────────────────────────

  describe('static raw', () => {
    it('throws when instance not set', () => {
      expect(() => Manager.raw('NOW()')).toThrow('Capsule not set as global');
    });
  });

  // ── static table ───────────────────────────────────

  describe('static table', () => {
    it('throws when instance not set', () => {
      expect(() => Manager.table('users')).toThrow('Capsule not set as global');
    });
  });

  // ── instance method delegation ──────────────────────

  describe('instance methods', () => {
    it('listen registers query listener without errors', () => {
      const mgr = new Manager();
      expect(() => mgr.listen(() => {})).not.toThrow();
    });
  });
});
