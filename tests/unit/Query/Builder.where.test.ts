import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — where clauses', () => {

  // ── basic where ───────────────────────────────────────

  describe('where', () => {
    it('three-arg form: column, operator, value', () => {
      const { builder } = createBuilder('users');
      builder.where('id', '=', 1);

      expect(builder.toSql()).toContain('where `id` = ?');
      expect(builder.getBindings()).toEqual([1]);
    });

    it('two-arg form defaults to = operator', () => {
      const { builder } = createBuilder('users');
      builder.where('name', 'John');

      expect(builder.toSql()).toContain('where `name` = ?');
      expect(builder.getBindings()).toEqual(['John']);
    });

    it('multiple wheres are ANDed', () => {
      const { builder } = createBuilder('users');
      builder.where('a', 1).where('b', 2);

      const sql = builder.toSql();
      expect(sql).toContain('`a` = ?');
      expect(sql).toContain('and `b` = ?');
      expect(builder.getBindings()).toEqual([1, 2]);
    });

    it('supports > operator', () => {
      const { builder } = createBuilder('users');
      builder.where('age', '>', 18);
      expect(builder.toSql()).toContain('`age` > ?');
    });

    it('supports < operator', () => {
      const { builder } = createBuilder('users');
      builder.where('age', '<', 65);
      expect(builder.toSql()).toContain('`age` < ?');
    });

    it('supports >= operator', () => {
      const { builder } = createBuilder('users');
      builder.where('score', '>=', 90);
      expect(builder.toSql()).toContain('`score` >= ?');
    });

    it('supports <= operator', () => {
      const { builder } = createBuilder('users');
      builder.where('score', '<=', 50);
      expect(builder.toSql()).toContain('`score` <= ?');
    });

    it('supports != operator', () => {
      const { builder } = createBuilder('users');
      builder.where('status', '!=', 'banned');
      expect(builder.toSql()).toContain('`status` != ?');
    });
  });

  // ── orWhere ───────────────────────────────────────────

  describe('orWhere', () => {
    it('adds OR condition', () => {
      const { builder } = createBuilder('users');
      builder.where('role', 'admin').orWhere('role', 'superadmin');

      expect(builder.toSql()).toContain('or `role` = ?');
      expect(builder.getBindings()).toEqual(['admin', 'superadmin']);
    });
  });

  // ── where null handling ───────────────────────────────

  describe('null handling', () => {
    it('where(col, null) becomes IS NULL', () => {
      const { builder } = createBuilder('users');
      builder.where('deleted_at', null);
      expect(builder.toSql()).toContain('is null');
    });

    it('where(col, "=", null) becomes IS NULL', () => {
      const { builder } = createBuilder('users');
      builder.where('deleted_at', '=', null);
      expect(builder.toSql()).toContain('is null');
    });

    it('where(col, "!=", null) becomes IS NOT NULL', () => {
      const { builder } = createBuilder('users');
      builder.where('email', '!=', null);
      expect(builder.toSql()).toContain('is not null');
    });
  });

  // ── whereNull / whereNotNull ──────────────────────────

  describe('whereNull / whereNotNull', () => {
    it('whereNull', () => {
      const { builder } = createBuilder('users');
      builder.whereNull('deleted_at');
      expect(builder.toSql()).toContain('`deleted_at` is null');
    });

    it('whereNotNull', () => {
      const { builder } = createBuilder('users');
      builder.whereNotNull('email');
      expect(builder.toSql()).toContain('`email` is not null');
    });

    it('orWhereNull', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereNull('name');
      expect(builder.toSql()).toContain('or `name` is null');
    });

    it('orWhereNotNull', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereNotNull('email');
      expect(builder.toSql()).toContain('or `email` is not null');
    });
  });

  // ── whereIn / whereNotIn ──────────────────────────────

  describe('whereIn / whereNotIn', () => {
    it('whereIn generates IN clause', () => {
      const { builder } = createBuilder('users');
      builder.whereIn('id', [1, 2, 3]);

      expect(builder.toSql()).toContain('`id` in (?, ?, ?)');
      expect(builder.getBindings()).toEqual([1, 2, 3]);
    });

    it('whereIn with empty array adds impossible condition', () => {
      const { builder } = createBuilder('users');
      builder.whereIn('id', []);
      expect(builder.toSql()).toContain('1 = 0');
    });

    it('whereNotIn generates NOT IN clause', () => {
      const { builder } = createBuilder('users');
      builder.whereNotIn('status', ['banned', 'suspended']);

      expect(builder.toSql()).toContain('not in');
      expect(builder.getBindings()).toEqual(['banned', 'suspended']);
    });

    it('whereNotIn with empty array is a no-op', () => {
      const { builder } = createBuilder('users');
      builder.whereNotIn('id', []);
      expect(builder.toSql()).not.toContain('not in');
    });

    it('orWhereIn', () => {
      const { builder } = createBuilder('users');
      builder.where('active', true).orWhereIn('role', ['admin', 'mod']);
      expect(builder.toSql()).toContain('or `role` in');
    });

    it('orWhereNotIn', () => {
      const { builder } = createBuilder('users');
      builder.where('active', true).orWhereNotIn('id', [1, 2]);
      expect(builder.toSql()).toContain('or `id` not in');
    });
  });

  // ── whereBetween / whereNotBetween ────────────────────

  describe('whereBetween / whereNotBetween', () => {
    it('whereBetween', () => {
      const { builder } = createBuilder('users');
      builder.whereBetween('age', [18, 65]);

      expect(builder.toSql()).toContain('between ? and ?');
      expect(builder.getBindings()).toEqual([18, 65]);
    });

    it('whereNotBetween', () => {
      const { builder } = createBuilder('users');
      builder.whereNotBetween('age', [0, 17]);
      expect(builder.toSql()).toContain('not between');
    });

    it('orWhereBetween', () => {
      const { builder } = createBuilder('users');
      builder.where('active', true).orWhereBetween('score', [90, 100]);
      expect(builder.toSql()).toContain('or `score` between');
    });

    it('orWhereNotBetween', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereNotBetween('age', [0, 17]);
      expect(builder.toSql()).toContain('or `age` not between');
    });
  });

  // ── whereNested ───────────────────────────────────────

  describe('whereNested (closure)', () => {
    it('groups conditions with parentheses', () => {
      const { builder } = createBuilder('users');
      builder.where('active', true).where((q: any) => {
        q.where('role', 'admin').orWhere('role', 'superadmin');
      });

      const sql = builder.toSql();
      expect(sql).toContain('(');
      expect(sql).toContain('`role` = ?');
      expect(builder.getBindings()).toEqual([true, 'admin', 'superadmin']);
    });
  });

  // ── whereColumn ───────────────────────────────────────

  describe('whereColumn', () => {
    it('compares two columns', () => {
      const { builder } = createBuilder('users');
      builder.whereColumn('updated_at', '>', 'created_at');
      expect(builder.toSql()).toContain('`updated_at` > `created_at`');
    });

    it('two-arg form defaults to =', () => {
      const { builder } = createBuilder('users');
      builder.whereColumn('first_name', 'last_name');
      expect(builder.toSql()).toContain('`first_name` = `last_name`');
    });

    it('orWhereColumn', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereColumn('a', 'b');
      expect(builder.toSql()).toContain('or `a` = `b`');
    });

    it('does not add bindings', () => {
      const { builder } = createBuilder('users');
      builder.whereColumn('a', '>', 'b');
      // only where bindings should be empty (no values, only columns)
      expect(builder.getRawBindings().where).toEqual([]);
    });
  });

  // ── whereExists / whereNotExists ──────────────────────

  describe('whereExists / whereNotExists', () => {
    it('whereExists with callback', () => {
      const { builder } = createBuilder('users');
      builder.whereExists((q: any) => q.from('orders').where('user_id', 1));
      expect(builder.toSql()).toContain('exists');
    });

    it('whereNotExists', () => {
      const { builder } = createBuilder('users');
      builder.whereNotExists((q: any) => q.from('orders'));
      expect(builder.toSql()).toContain('not exists');
    });

    it('orWhereExists', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereExists((q: any) => q.from('orders'));
      expect(builder.toSql()).toContain('or exists');
    });

    it('orWhereNotExists', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereNotExists((q: any) => q.from('orders'));
      expect(builder.toSql()).toContain('or not exists');
    });
  });

  // ── whereDate / whereTime / whereDay / etc ────────────

  describe('date/time clauses', () => {
    it('whereDate with implicit =', () => {
      const { builder } = createBuilder('users');
      builder.whereDate('created_at', '2024-01-01');
      expect(builder.getBindings()).toContain('2024-01-01');
      expect(builder.toSql()).toContain('date(');
    });

    it('whereDate with explicit operator', () => {
      const { builder } = createBuilder('events');
      builder.whereDate('event_date', '>=', '2024-06-01');
      expect(builder.getBindings()).toContain('2024-06-01');
      expect(builder.toSql()).toContain('date(');
    });

    it('whereTime', () => {
      const { builder } = createBuilder('events');
      builder.whereTime('start_time', '>', '12:00:00');
      expect(builder.getBindings()).toContain('12:00:00');
      expect(builder.toSql()).toContain('time(');
    });

    it('whereDay', () => {
      const { builder } = createBuilder('users');
      builder.whereDay('created_at', '15');
      expect(builder.getBindings()).toContain('15');
      expect(builder.toSql()).toContain('day(');
    });

    it('whereMonth', () => {
      const { builder } = createBuilder('users');
      builder.whereMonth('created_at', '=', '12');
      expect(builder.getBindings()).toContain('12');
      expect(builder.toSql()).toContain('month(');
    });

    it('whereYear', () => {
      const { builder } = createBuilder('users');
      builder.whereYear('created_at', '2024');
      expect(builder.getBindings()).toContain('2024');
      expect(builder.toSql()).toContain('year(');
    });
  });

  // ── whereRaw ──────────────────────────────────────────

  describe('whereRaw / orWhereRaw', () => {
    it('whereRaw injects raw SQL', () => {
      const { builder } = createBuilder('users');
      builder.whereRaw('age > ? AND age < ?', [18, 65]);

      expect(builder.toSql()).toContain('age > ? AND age < ?');
      expect(builder.getBindings()).toEqual([18, 65]);
    });

    it('orWhereRaw', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereRaw('name = ?', ['admin']);

      expect(builder.toSql()).toContain('or name = ?');
    });
  });

  // ── whereLike / whereNotLike ──────────────────────────

  describe('whereLike / whereNotLike', () => {
    it('whereLike', () => {
      const { builder } = createBuilder('users');
      builder.whereLike('name', '%John%');
      expect(builder.getBindings()).toEqual(['%John%']);
      expect(builder.toSql()).toContain('like');
    });

    it('orWhereLike', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereLike('name', '%test%');
      expect(builder.toSql()).toContain('or');
    });

    it('whereNotLike', () => {
      const { builder } = createBuilder('users');
      builder.whereNotLike('email', '%spam%');
      expect(builder.getBindings()).toEqual(['%spam%']);
      expect(builder.toSql()).toContain('not like');
    });

    it('orWhereNotLike', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereNotLike('name', '%bot%');
      expect(builder.toSql()).toContain('or');
    });
  });

  // ── whereJson ─────────────────────────────────────────

  describe('whereJson*', () => {
    it('whereJsonContains', () => {
      const { builder } = createBuilder('users');
      builder.whereJsonContains('settings', 'dark_mode');
      expect(builder.getBindings()).toContain('dark_mode');
      expect(builder.toSql()).toContain('json_contains');
    });

    it('whereJsonDoesntContain', () => {
      const { builder } = createBuilder('users');
      builder.whereJsonDoesntContain('tags', 'beta');
      expect(builder.getBindings()).toContain('beta');
      expect(builder.toSql()).toContain('not json_contains');
    });

    it('whereJsonLength with implicit =', () => {
      const { builder } = createBuilder('users');
      builder.whereJsonLength('tags', 5 as any);
      expect(builder.getBindings()).toContain(5);
      expect(builder.toSql()).toContain('json_length');
    });

    it('whereJsonLength with explicit operator', () => {
      const { builder } = createBuilder('users');
      builder.whereJsonLength('tags', '>', 3);
      expect(builder.getBindings()).toContain(3);
      expect(builder.toSql()).toContain('json_length');
    });
  });

  // ── whereNot / orWhereNot ─────────────────────────────

  describe('whereNot / orWhereNot', () => {
    it('whereNot adds negated condition', () => {
      const { builder } = createBuilder('users');
      builder.whereNot('status', 'banned');
      expect(builder.getBindings()).toEqual(['banned']);
      expect(builder.toSql()).toContain('not');
    });

    it('orWhereNot', () => {
      const { builder } = createBuilder('users');
      builder.where('id', 1).orWhereNot('status', 'inactive');
      expect(builder.getBindings()).toEqual([1, 'inactive']);
    });
  });

  // ── whereAny / whereAll / whereNone ───────────────────

  describe('whereAny / whereAll / whereNone', () => {
    it('whereAny matches any of given columns', () => {
      const { builder } = createBuilder('users');
      builder.whereAny(['name', 'email'], 'like', '%test%');

      const sql = builder.toSql();
      expect(sql).toContain('`name`');
      expect(sql).toContain('`email`');
      expect(sql).toContain('or');
    });

    it('whereAll matches all of given columns', () => {
      const { builder } = createBuilder('users');
      builder.whereAll(['a', 'b'], '>', 10);

      const sql = builder.toSql();
      expect(sql).toContain('`a` > ?');
      expect(sql).toContain('`b` > ?');
    });

    it('whereNone negates all columns', () => {
      const { builder } = createBuilder('users');
      builder.whereNone(['x', 'y'], '!=', 0);

      const sql = builder.toSql();
      expect(sql).toContain('`x`');
      expect(sql).toContain('`y`');
    });
  });

  // ── whereFullText ─────────────────────────────────────

  describe('whereFullText', () => {
    it('single column', () => {
      const { builder } = createBuilder('articles');
      builder.whereFullText('body', 'search query');
      expect(builder.getBindings()).toContain('search query');
      expect(builder.toSql()).toContain('match');
    });

    it('multiple columns', () => {
      const { builder } = createBuilder('articles');
      builder.whereFullText(['title', 'body'], 'keyword');
      expect(builder.getBindings()).toContain('keyword');
      expect(builder.toSql()).toContain('match');
    });

    it('orWhereFullText', () => {
      const { builder } = createBuilder('articles');
      builder.where('id', 1).orWhereFullText('body', 'term');
      expect(builder.toSql()).toContain('or');
    });
  });
});
