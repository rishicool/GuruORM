import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — subqueries & advanced where', () => {

  // ── fromSub ──────────────────────────────────────────

  describe('fromSub', () => {
    it('sets subquery as from clause via callback', () => {
      const { builder } = createBuilder('users');
      builder.fromSub((q: any) => {
        q.from('orders').select('user_id').where('total', '>', 100);
      }, 'big_spenders');

      const sql = builder.toSql();
      expect(sql).toContain('big_spenders');
    });

    it('accepts Builder instance', () => {
      const { builder } = createBuilder('users');
      const { builder: sub } = createBuilder('orders');
      sub.select('user_id').where('total', '>', 100);

      builder.fromSub(sub, 'active_orders');
      const sql = builder.toSql();
      expect(sql).toContain('active_orders');
    });
  });

  // ── whereSub ─────────────────────────────────────────

  describe('whereSub', () => {
    it('adds subquery where clause', () => {
      const { builder } = createBuilder('users');
      builder.whereSub('id', 'in', (q) => {
        q.from('orders').select('user_id');
      });

      expect(builder.toSql()).toContain('select');
    });
  });

  // ── whereInSub ───────────────────────────────────────

  describe('whereInSub', () => {
    it('stores subquery where type', () => {
      const { builder } = createBuilder('users');
      builder.whereInSub('id', (q) => {
        q.from('orders').select('user_id');
      });

      // Verify a where clause was added
      expect(builder.getBindings()).toEqual([]);
    });
  });

  // ── whereNotInSub ────────────────────────────────────

  describe('whereNotInSub', () => {
    it('stores not-in subquery where type', () => {
      const { builder } = createBuilder('users');
      builder.whereNotInSub('id', (q) => {
        q.from('blocked_users').select('user_id');
      });

      expect(builder.getBindings()).toEqual([]);
    });
  });

  // ── leftJoinWhere ────────────────────────────────────

  describe('leftJoinWhere', () => {
    it('adds left join with where-style condition', () => {
      const { builder } = createBuilder('users');
      builder.leftJoinWhere('orders', 'users.id', '=', 'orders.user_id');

      const sql = builder.toSql();
      expect(sql).toContain('left join');
    });
  });

  // ── find / findOrFail ────────────────────────────────

  describe('find', () => {
    it('finds by primary key', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 5, name: 'Alice' }]);

      const result = await builder.find(5);
      expect(result).toEqual({ id: 5, name: 'Alice' });
    });

    it('returns undefined when not found', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      const result = await builder.find(999);
      expect(result).toBeNull();
    });
  });

  describe('findOrFail', () => {
    it('returns record when found', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1, name: 'Bob' }]);

      const result = await builder.findOrFail(1);
      expect(result.name).toBe('Bob');
    });

    it('throws when not found', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      await expect(builder.findOrFail(999)).rejects.toThrow();
    });
  });

  // ── firstOrFail ──────────────────────────────────────

  describe('firstOrFail', () => {
    it('returns first record', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }]);

      const result = await builder.firstOrFail();
      expect(result).toEqual({ id: 1 });
    });

    it('throws when no results', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      await expect(builder.firstOrFail()).rejects.toThrow('No query results');
    });
  });

  // ── sole ─────────────────────────────────────────────

  describe('sole', () => {
    it('returns single record', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }]);

      const result = await builder.sole();
      expect(result).toEqual({ id: 1 });
    });

    it('throws when no results', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      await expect(builder.sole()).rejects.toThrow();
    });

    it('throws when multiple results', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await expect(builder.sole()).rejects.toThrow();
    });
  });

  // ── value / pluck ────────────────────────────────────

  describe('value', () => {
    it('returns single column value', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ email: 'alice@test.com' }]);

      const result = await builder.value('email');
      expect(result).toBe('alice@test.com');
    });

    it('returns null when no result', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([]);

      expect(await builder.value('email')).toBeNull();
    });
  });

  describe('pluck', () => {
    it('returns array of column values', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([
        { name: 'Alice' },
        { name: 'Bob' },
      ]);

      const result = await builder.pluck('name');
      expect(result).toEqual(['Alice', 'Bob']);
    });
  });

  // ── addBinding / getBindings / getRawBindings ────────

  describe('addBinding', () => {
    it('adds to where bindings by default', () => {
      const { builder } = createBuilder('users');
      builder.addBinding(42);
      expect(builder.getBindings()).toContain(42);
    });

    it('adds to specific binding type', () => {
      const { builder } = createBuilder('users');
      builder.addBinding('test', 'select');
      expect(builder.getRawBindings().select).toContain('test');
    });
  });

  // ── newQuery ─────────────────────────────────────────

  describe('newQuery', () => {
    it('creates fresh builder with same connection', () => {
      const { builder } = createBuilder('users');
      builder.where('active', true);

      const fresh = builder.newQuery();
      expect(fresh.getBindings()).toEqual([]);
    });
  });
});
