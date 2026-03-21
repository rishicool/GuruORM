import { describe, it, expect, beforeEach } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — select', () => {
  // ── select * ──────────────────────────────────────────

  describe('select *', () => {
    it('generates select * by default', () => {
      const { builder } = createBuilder('users');
      expect(builder.toSql()).toBe('select * from `users`');
    });

    it('has no bindings', () => {
      const { builder } = createBuilder('users');
      expect(builder.getBindings()).toEqual([]);
    });
  });

  // ── select specific columns ───────────────────────────

  describe('specific columns', () => {
    it('selects named columns', () => {
      const { builder } = createBuilder('users');
      builder.select('id', 'name');
      expect(builder.toSql()).toBe('select `id`, `name` from `users`');
    });

    it('single column', () => {
      const { builder } = createBuilder('users');
      builder.select('email');
      expect(builder.toSql()).toBe('select `email` from `users`');
    });
  });

  // ── addSelect ─────────────────────────────────────────

  describe('addSelect', () => {
    it('appends columns to existing select', () => {
      const { builder } = createBuilder('users');
      builder.select('id').addSelect('name', 'email');
      expect(builder.toSql()).toBe('select `id`, `name`, `email` from `users`');
    });
  });

  // ── selectRaw ─────────────────────────────────────────

  describe('selectRaw', () => {
    it('adds raw expression as column', () => {
      const { builder } = createBuilder('users');
      builder.selectRaw('COUNT(*) as total');
      expect(builder.toSql()).toContain('COUNT(*) as total');
    });

    it('accepts bindings', () => {
      const { builder } = createBuilder('users');
      builder.selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as cnt', ['active']);
      expect(builder.getBindings()).toEqual(['active']);
    });
  });

  // ── selectSub ─────────────────────────────────────────

  describe('selectSub', () => {
    it('adds subquery as a column', () => {
      const { builder } = createBuilder('users');
      builder.selectSub((q: any) => q.from('orders').select('id'), 'latest_order');
      const sql = builder.toSql();
      expect(sql).toContain('latest_order');
    });
  });

  // ── distinct ──────────────────────────────────────────

  describe('distinct', () => {
    it('adds DISTINCT keyword', () => {
      const { builder } = createBuilder('users');
      builder.distinct().select('email');
      expect(builder.toSql()).toContain('distinct');
    });
  });

  // ── from ──────────────────────────────────────────────

  describe('from', () => {
    it('sets the table', () => {
      const { builder } = createBuilder('posts');
      expect(builder.toSql()).toContain('`posts`');
    });

    it('supports alias', () => {
      const { builder } = createBuilder('posts');
      builder.from('posts', 'p');
      expect(builder.toSql()).toContain('posts');
    });
  });

  // ── execution (mocked) ───────────────────────────────

  describe('get()', () => {
    it('calls connection.select with compiled SQL', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1, name: 'Alice' }]);

      const rows = await builder.get();

      expect(connection.select).toHaveBeenCalledWith(
        expect.stringContaining('select'),
        expect.any(Array),
      );
      expect(rows).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('accepts column list', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }]);

      await builder.get(['id']);

      const sql = connection.select.mock.calls[0][0];
      expect(sql).toContain('`id`');
    });
  });

  describe('first()', () => {
    it('returns first row', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }]);

      const row = await builder.first();
      expect(row).toEqual({ id: 1 });
    });

    it('returns null when no rows', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      expect(await builder.first()).toBeNull();
    });
  });

  describe('value()', () => {
    it('returns single column from first row', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ email: 'a@b.com' }]);

      expect(await builder.value('email')).toBe('a@b.com');
    });

    it('returns null when no rows', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      expect(await builder.value('email')).toBeNull();
    });
  });

  describe('pluck()', () => {
    it('returns array of single column values', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' },
      ]);

      expect(await builder.pluck('name')).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('returns empty array when no rows', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      expect(await builder.pluck('name')).toEqual([]);
    });
  });
});
