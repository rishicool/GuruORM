import { describe, it, expect } from '@jest/globals';
import { Grammar } from '../../../../src/Query/Grammars/MySqlGrammar';
import { Expression } from '../../../../src/Query/Expression';

describe('Query / Grammars / MySqlGrammar', () => {

  // ── wrapValue (backticks) ────────────────────────────

  describe('wrap', () => {
    it('uses backticks instead of double quotes', () => {
      const g = new Grammar();
      expect(g.wrap('name')).toBe('`name`');
    });

    it('wraps dotted column', () => {
      const g = new Grammar();
      expect(g.wrap('users.name')).toBe('`users`.`name`');
    });

    it('handles alias', () => {
      const g = new Grammar();
      expect(g.wrap('name as n')).toBe('`name` as `n`');
    });

    it('escapes backtick in identifier', () => {
      const g = new Grammar();
      expect(g.wrap('col`name')).toBe('`col``name`');
    });

    it('preserves *', () => {
      const g = new Grammar();
      expect(g.wrap('*')).toBe('*');
    });

    it('wraps Expression as raw value', () => {
      const g = new Grammar();
      expect(g.wrap(new Expression('COUNT(*)'))).toBe('COUNT(*)');
    });
  });

  // ── wrapTable ────────────────────────────────────────

  describe('wrapTable', () => {
    it('wraps with backticks', () => {
      const g = new Grammar();
      expect(g.wrapTable('users')).toBe('`users`');
    });

    it('includes prefix', () => {
      const g = new Grammar();
      g.setTablePrefix('app_');
      expect(g.wrapTable('users')).toBe('`app_users`');
    });
  });

  // ── compileInsertGetId ────────────────────────────────

  describe('compileInsertGetId', () => {
    it('returns plain insert (MySQL has no RETURNING)', () => {
      const g = new Grammar();
      const mockBuilder: any = {
        fromTable: 'users',
        fromAlias: undefined,
        columns: [],
        wheres: [],
        joins: [],
        groups: [],
        havings: [],
        orders: [],
        unions: [],
        limitValue: null,
        offsetValue: null,
        lock: null,
        returningColumns: [],
        getReturning: () => [],
      };

      const sql = g.compileInsertGetId(mockBuilder, { name: 'Alice' });
      expect(sql).toContain('insert into `users`');
      expect(sql).not.toContain('returning');
    });
  });

  // ── compileInsertOrIgnore ────────────────────────────

  describe('compileInsertOrIgnore', () => {
    it('produces INSERT IGNORE', () => {
      const g = new Grammar();
      const mockBuilder: any = {
        fromTable: 'users',
        fromAlias: undefined,
        returningColumns: [],
        getReturning: () => [],
      };

      const sql = g.compileInsertOrIgnore(mockBuilder, [{ name: 'A' }]);
      expect(sql.toLowerCase()).toContain('insert ignore');
    });
  });

  // ── compileUpsert ────────────────────────────────────

  describe('compileUpsert', () => {
    it('produces ON DUPLICATE KEY UPDATE', () => {
      const g = new Grammar();
      const mockBuilder: any = {
        fromTable: 'users',
        fromAlias: undefined,
        returningColumns: [],
        getReturning: () => [],
      };

      const sql = g.compileUpsert(
        mockBuilder,
        [{ email: 'a@b.com', name: 'Alice' }],
        ['email'],
        ['name'],
      );

      expect(sql.toLowerCase()).toContain('on duplicate key update');
      expect(sql).toContain('`name`');
    });

    it('auto-selects update columns when not specified', () => {
      const g = new Grammar();
      const mockBuilder: any = {
        fromTable: 'users',
        fromAlias: undefined,
        returningColumns: [],
        getReturning: () => [],
      };

      const sql = g.compileUpsert(
        mockBuilder,
        [{ email: 'a@b.com', name: 'Alice' }],
        ['email'],
      );

      // Should update name (not email since it's the unique key)
      expect(sql).toContain('`name`');
    });
  });

  // ── setWrapIdentifier ────────────────────────────────

  describe('setWrapIdentifier', () => {
    it('overrides backtick wrapping', () => {
      const g = new Grammar();
      g.setWrapIdentifier((value: string, _origImpl: (v: string) => string) => `[${value}]`);
      expect(g.wrap('name')).toBe('[name]');
    });

    it('origImpl still uses backticks', () => {
      const g = new Grammar();
      g.setWrapIdentifier((value: string, origImpl: (v: string) => string) => {
        return origImpl(value);
      });
      expect(g.wrap('name')).toBe('`name`');
    });
  });
});
