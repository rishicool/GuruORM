import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — conditional & utility', () => {

  // ── when ─────────────────────────────────────────────

  describe('when', () => {
    it('applies callback when value is truthy', () => {
      const { builder } = createBuilder('users');
      builder.when(true, (q) => q.where('active', true));

      expect(builder.toSql()).toContain('where');
    });

    it('skips callback when value is falsy', () => {
      const { builder } = createBuilder('users');
      builder.when(false, (q) => q.where('active', true));

      expect(builder.toSql()).not.toContain('where');
    });

    it('runs default callback when value is falsy', () => {
      const { builder } = createBuilder('users');
      builder.when(
        false,
        (q) => q.where('status', 'active'),
        (q) => q.where('status', 'all'),
      );

      expect(builder.getBindings()).toContain('all');
    });

    it('accepts function as value', () => {
      const { builder } = createBuilder('users');
      builder.when(
        () => 'search-term',
        (q, val) => q.where('name', val),
      );

      expect(builder.getBindings()).toContain('search-term');
    });

    it('returns this for chaining', () => {
      const { builder } = createBuilder('users');
      const result = builder.when(true, (q) => q.limit(10));
      expect(result).toBe(builder);
    });
  });

  // ── unless ───────────────────────────────────────────

  describe('unless', () => {
    it('applies callback when value is falsy', () => {
      const { builder } = createBuilder('users');
      builder.unless(false, (q) => q.where('active', true));

      expect(builder.toSql()).toContain('where');
    });

    it('skips callback when value is truthy', () => {
      const { builder } = createBuilder('users');
      builder.unless(true, (q) => q.where('active', true));

      expect(builder.toSql()).not.toContain('where');
    });

    it('runs default callback when value is truthy', () => {
      const { builder } = createBuilder('users');
      builder.unless(
        true,
        (q) => q.where('status', 'guest'),
        (q) => q.where('status', 'member'),
      );

      expect(builder.getBindings()).toContain('member');
    });

    it('accepts function as value', () => {
      const { builder } = createBuilder('users');
      builder.unless(
        () => null,
        (q) => q.where('show', 'all'),
      );

      expect(builder.getBindings()).toContain('all');
    });
  });

  // ── union ────────────────────────────────────────────

  describe('union', () => {
    it('adds union clause', () => {
      const { builder } = createBuilder('users');
      builder.select('name').union((q: any) => {
        q.from('admins').select('name');
      });

      const sql = builder.toSql();
      expect(sql.toLowerCase()).toContain('union');
    });

    it('accepts Builder instance', () => {
      const { builder } = createBuilder('users');
      const { builder: other } = createBuilder('admins');
      other.select('name');

      builder.select('name').union(other);
      const sql = builder.toSql();
      expect(sql.toLowerCase()).toContain('union');
    });
  });

  describe('unionAll', () => {
    it('adds union all clause', () => {
      const { builder } = createBuilder('users');
      builder.select('name').unionAll((q: any) => {
        q.from('admins').select('name');
      });

      const sql = builder.toSql();
      expect(sql.toLowerCase()).toContain('union all');
    });
  });

  // ── lock ─────────────────────────────────────────────

  describe('lockForUpdate', () => {
    it('sets update lock', () => {
      const { builder } = createBuilder('users');
      builder.lockForUpdate();

      const sql = builder.toSql();
      expect(sql.toLowerCase()).toContain('for update');
    });
  });

  describe('sharedLock', () => {
    it('sets shared lock', () => {
      const { builder } = createBuilder('users');
      builder.sharedLock();

      const sql = builder.toSql();
      expect(sql.toLowerCase()).toContain('for share');
    });
  });

  // ── clone ────────────────────────────────────────────

  describe('clone', () => {
    it('creates independent copy', () => {
      const { builder } = createBuilder('users');
      builder.where('active', true);

      const cloned = builder.clone();
      cloned.where('role', 'admin');

      // Original should not have role where
      expect(builder.toSql()).not.toContain('`role`');
      expect(cloned.toSql()).toContain('`role`');
    });

    it('preserves all query parts', () => {
      const { builder } = createBuilder('users');
      builder.select('name').where('active', true).orderBy('name').limit(10);

      const cloned = builder.clone();

      expect(cloned.toSql()).toBe(builder.toSql());
      expect(cloned.getBindings()).toEqual(builder.getBindings());
    });

    it('bindings are independent', () => {
      const { builder } = createBuilder('users');
      builder.where('a', 1);

      const cloned = builder.clone();
      cloned.where('b', 2);

      expect(builder.getBindings()).toEqual([1]);
      expect(cloned.getBindings()).toEqual([1, 2]);
    });
  });

  // ── toSql / toRawSql ────────────────────────────────

  describe('toSql', () => {
    it('returns SQL string with placeholders', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1);

      expect(builder.toSql()).toContain('?');
    });
  });

  describe('toRawSql', () => {
    it('interpolates bindings into SQL', () => {
      const { builder } = createBuilder('users');
      builder.where('name', 'Alice');

      const raw = builder.toRawSql();
      expect(raw).toContain("'Alice'");
      expect(raw).not.toContain('?');
    });

    it('handles numeric bindings', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 42);

      const raw = builder.toRawSql();
      expect(raw).toContain('42');
    });
  });

  // ── explain ──────────────────────────────────────────

  describe('explain', () => {
    it('prepends EXPLAIN to the query', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ type: 'ALL' }]);

      await builder.explain();

      const [sql] = connection.select.mock.calls[0];
      expect(sql).toMatch(/^EXPLAIN\s/);
    });
  });

  // ── cursor ───────────────────────────────────────────

  describe('cursor', () => {
    it('yields each row from results', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const rows = [];
      for await (const row of builder.cursor()) {
        rows.push(row);
      }

      expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  // ── dump ─────────────────────────────────────────────

  describe('dump', () => {
    it('logs SQL and bindings and returns this', () => {
      const { builder } = createBuilder('users');
      const spy = jest.spyOn(console, 'log').mockImplementation();

      builder.where('id', 1);
      const result = builder.dump();

      expect(result).toBe(builder);
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('dumpRawSql', () => {
    it('logs raw SQL and returns this', () => {
      const { builder } = createBuilder('users');
      const spy = jest.spyOn(console, 'log').mockImplementation();

      builder.where('name', 'Alice');
      const result = builder.dumpRawSql();

      expect(result).toBe(builder);
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
