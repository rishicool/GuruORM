import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — groupBy & having', () => {

  // ── groupBy ──────────────────────────────────────────

  describe('groupBy', () => {
    it('single column', () => {
      const { builder } = createBuilder('orders');
      builder.select('status').groupBy('status');
      expect(builder.toSql()).toContain('group by `status`');
    });

    it('multiple columns', () => {
      const { builder } = createBuilder('orders');
      builder.groupBy('status', 'type');
      const sql = builder.toSql();
      expect(sql).toContain('`status`');
      expect(sql).toContain('`type`');
    });

    it('chainable with select', () => {
      const { builder } = createBuilder('orders');
      builder.select('status').groupBy('status');
      expect(builder.toSql()).toBe('select `status` from `orders` group by `status`');
    });
  });

  describe('groupByRaw', () => {
    it('adds raw group by expression', () => {
      const { builder } = createBuilder('orders');
      builder.groupByRaw('YEAR(created_at)');
      expect(builder.toSql()).toContain('group by YEAR(created_at)');
    });

    it('supports bindings', () => {
      const { builder } = createBuilder('orders');
      builder.groupByRaw('YEAR(created_at), status = ?', ['active']);
      expect(builder.getBindings()).toEqual(['active']);
    });
  });

  // ── having ───────────────────────────────────────────

  describe('having', () => {
    it('basic having clause', () => {
      const { builder } = createBuilder('orders');
      builder.select('status').groupBy('status').having('status', '=', 'active');

      const sql = builder.toSql();
      expect(sql).toContain('having');
      expect(builder.getBindings()).toContain('active');
    });

    it('two-arg shorthand (column, value) defaults to =', () => {
      const { builder } = createBuilder('orders');
      builder.groupBy('status').having('status', 'active');
      expect(builder.getBindings()).toContain('active');
    });
  });

  describe('havingRaw', () => {
    it('adds raw having SQL', () => {
      const { builder } = createBuilder('orders');
      builder.groupBy('user_id').havingRaw('COUNT(*) > ?', [5]);

      const sql = builder.toSql();
      expect(sql).toContain('COUNT(*) > ?');
      expect(builder.getBindings()).toContain(5);
    });
  });

  describe('orHaving', () => {
    it('adds or having clause', () => {
      const { builder } = createBuilder('orders');
      builder
        .groupBy('status')
        .having('status', 'active')
        .orHaving('status', 'pending');

      const sql = builder.toSql();
      expect(sql).toContain('or');
      expect(builder.getBindings()).toEqual(['active', 'pending']);
    });
  });

  describe('orHavingRaw', () => {
    it('adds raw or having clause', () => {
      const { builder } = createBuilder('orders');
      builder
        .groupBy('user_id')
        .havingRaw('COUNT(*) > ?', [5])
        .orHavingRaw('SUM(total) > ?', [1000]);

      expect(builder.getBindings()).toEqual([5, 1000]);
    });
  });

  describe('havingBetween', () => {
    it('adds having between clause', () => {
      const { builder } = createBuilder('orders');
      builder.groupBy('user_id').havingBetween('user_id', [1, 10]);

      const sql = builder.toSql();
      expect(sql).toContain('having');
      expect(builder.getBindings()).toEqual([1, 10]);
    });
  });
});
