import { describe, it, expect } from '@jest/globals';
import { Grammar } from '../../../../src/Query/Grammars/Grammar';
import { Expression } from '../../../../src/Query/Expression';

describe('Query / Grammars / BaseGrammar', () => {

  // ── wrap ─────────────────────────────────────────────

  describe('wrap', () => {
    it('wraps a simple column name', () => {
      const g = new Grammar();
      expect(g.wrap('name')).toBe('"name"');
    });

    it('wraps dotted column (table.column)', () => {
      const g = new Grammar();
      expect(g.wrap('users.name')).toBe('"users"."name"');
    });

    it('handles aliased values (as keyword)', () => {
      const g = new Grammar();
      expect(g.wrap('name as n')).toBe('"name" as "n"');
    });

    it('returns raw expression value unchanged', () => {
      const g = new Grammar();
      const expr = new Expression('COUNT(*)');
      expect(g.wrap(expr)).toBe('COUNT(*)');
    });

    it('preserves * as-is', () => {
      const g = new Grammar();
      expect(g.wrap('*')).toBe('*');
    });

    it('converts non-string values to string', () => {
      const g = new Grammar();
      expect(g.wrap(42 as any)).toBe('"42"');
    });
  });

  // ── wrapTable ────────────────────────────────────────

  describe('wrapTable', () => {
    it('wraps table name', () => {
      const g = new Grammar();
      expect(g.wrapTable('users')).toBe('"users"');
    });

    it('applies table prefix', () => {
      const g = new Grammar();
      g.setTablePrefix('app_');
      expect(g.wrapTable('users')).toBe('"app_users"');
    });

    it('returns raw expression unchanged', () => {
      const g = new Grammar();
      const expr = new Expression('users');
      expect(g.wrapTable(expr)).toBe('users');
    });
  });

  // ── setTablePrefix / getTablePrefix ──────────────────

  describe('tablePrefix', () => {
    it('defaults to empty string', () => {
      const g = new Grammar();
      expect(g.getTablePrefix()).toBe('');
    });

    it('set and get', () => {
      const g = new Grammar();
      g.setTablePrefix('wp_');
      expect(g.getTablePrefix()).toBe('wp_');
    });
  });

  // ── parameter / parameterize ─────────────────────────

  describe('parameter', () => {
    it('returns ? placeholder', () => {
      const g = new Grammar();
      expect(g.parameter()).toBe('?');
    });
  });

  describe('parameterize', () => {
    it('creates comma-separated placeholders', () => {
      const g = new Grammar();
      expect(g.parameterize([1, 2, 3])).toBe('?, ?, ?');
    });

    it('returns empty string for empty array', () => {
      const g = new Grammar();
      expect(g.parameterize([])).toBe('');
    });
  });

  // ── columnize ────────────────────────────────────────

  describe('columnize', () => {
    it('wraps and joins column names', () => {
      const g = new Grammar();
      expect(g.columnize(['id', 'name', 'email'])).toBe('"id", "name", "email"');
    });
  });

  // ── getValue ─────────────────────────────────────────

  describe('getValue', () => {
    it('extracts raw expression value', () => {
      const g = new Grammar();
      const expr = new Expression('NOW()');
      expect(g.getValue(expr)).toBe('NOW()');
    });
  });

  // ── setWrapIdentifier ────────────────────────────────

  describe('setWrapIdentifier', () => {
    it('custom hook replaces default wrapping', () => {
      const g = new Grammar();
      g.setWrapIdentifier((value: string, origImpl: (v: string) => string) => {
        return `[${value}]`;
      });

      expect(g.wrap('name')).toBe('[name]');
    });

    it('custom hook receives origImpl for fallback', () => {
      const g = new Grammar();
      g.setWrapIdentifier((value: string, origImpl: (v: string) => string) => {
        if (value === 'raw_col') return value;
        return origImpl(value);
      });

      expect(g.wrap('raw_col')).toBe('raw_col');
      expect(g.wrap('other')).toBe('"other"');
    });

    it('still passes through * without custom wrapping', () => {
      const g = new Grammar();
      g.setWrapIdentifier((value: string, _origImpl: (v: string) => string) => `[${value}]`);
      expect(g.wrap('*')).toBe('*');
    });
  });
});
