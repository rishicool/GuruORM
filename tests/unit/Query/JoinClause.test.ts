import { describe, it, expect } from '@jest/globals';
import { JoinClause } from '../../../src/Query/JoinClause';

describe('Query / JoinClause', () => {

  // ── Construction ──────────────────────────────────────

  describe('constructor', () => {
    it('sets table and type', () => {
      const join = new JoinClause('orders', 'left');
      expect(join.table).toBe('orders');
      expect(join.type).toBe('left');
    });

    it('defaults type to inner', () => {
      const join = new JoinClause('orders');
      expect(join.type).toBe('inner');
    });

    it('starts with no wheres', () => {
      const join = new JoinClause('orders');
      expect(join.wheres).toEqual([]);
    });

    it('starts with empty bindings', () => {
      const join = new JoinClause('orders');
      expect(join.getBindings()).toEqual([]);
    });
  });

  // ── on() ──────────────────────────────────────────────

  describe('on', () => {
    it('adds a Column-type where with three args', () => {
      const join = new JoinClause('orders');
      join.on('users.id', '=', 'orders.user_id');

      expect(join.wheres).toHaveLength(1);
      expect(join.wheres[0]).toMatchObject({
        type: 'Column',
        first: 'users.id',
        operator: '=',
        second: 'orders.user_id',
        boolean: 'and',
      });
    });

    it('uses = when only two args given', () => {
      const join = new JoinClause('orders');
      join.on('users.id', 'orders.user_id');

      expect(join.wheres[0].operator).toBe('=');
      expect(join.wheres[0].second).toBe('orders.user_id');
    });

    it('does not add bindings (column-to-column)', () => {
      const join = new JoinClause('orders');
      join.on('a', '=', 'b');
      expect(join.getBindings()).toEqual([]);
    });

    it('returns this for chaining', () => {
      const join = new JoinClause('orders');
      expect(join.on('a', '=', 'b')).toBe(join);
    });
  });

  // ── orOn() ────────────────────────────────────────────

  describe('orOn', () => {
    it('sets boolean to or', () => {
      const join = new JoinClause('orders');
      join.on('a', '=', 'b');
      join.orOn('c', '=', 'd');

      expect(join.wheres[1].boolean).toBe('or');
    });
  });

  // ── where() ───────────────────────────────────────────

  describe('where', () => {
    it('adds a Basic-type where with value binding', () => {
      const join = new JoinClause('orders');
      join.where('status', '=', 'active');

      expect(join.wheres).toHaveLength(1);
      expect(join.wheres[0]).toMatchObject({
        type: 'Basic',
        column: 'status',
        operator: '=',
        value: 'active',
        boolean: 'and',
      });
      expect(join.getBindings()).toEqual(['active']);
    });

    it('uses = when only two args given', () => {
      const join = new JoinClause('orders');
      join.where('active', true);

      expect(join.wheres[0].operator).toBe('=');
      expect(join.wheres[0].value).toBe(true);
    });

    it('accepts explicit boolean param', () => {
      const join = new JoinClause('orders');
      join.where('x', '=', 1, 'or');
      expect(join.wheres[0].boolean).toBe('or');
    });
  });

  // ── onNested() ────────────────────────────────────────

  describe('onNested', () => {
    it('adds a Nested-type where', () => {
      const join = new JoinClause('orders');
      join.onNested((nested) => {
        nested.on('a', '=', 'b');
        nested.orOn('c', '=', 'd');
      });

      expect(join.wheres).toHaveLength(1);
      expect(join.wheres[0].type).toBe('Nested');
      expect(join.wheres[0].query.wheres).toHaveLength(2);
    });

    it('defaults boolean to and', () => {
      const join = new JoinClause('orders');
      join.onNested(() => {});
      expect(join.wheres[0].boolean).toBe('and');
    });

    it('accepts or boolean', () => {
      const join = new JoinClause('orders');
      join.onNested(() => {}, 'or');
      expect(join.wheres[0].boolean).toBe('or');
    });
  });

  // ── addBinding() ──────────────────────────────────────

  describe('addBinding', () => {
    it('adds a single value', () => {
      const join = new JoinClause('orders');
      join.addBinding(42, 'where');
      expect(join.getBindings()).toEqual([42]);
    });

    it('adds an array of values', () => {
      const join = new JoinClause('orders');
      join.addBinding([1, 2, 3], 'where');
      expect(join.getBindings()).toEqual([1, 2, 3]);
    });

    it('accumulates across multiple calls', () => {
      const join = new JoinClause('orders');
      join.addBinding(1, 'where');
      join.addBinding(2, 'where');
      expect(join.getBindings()).toEqual([1, 2]);
    });
  });

  // ── chaining ──────────────────────────────────────────

  describe('chaining', () => {
    it('supports on + where chain', () => {
      const join = new JoinClause('orders', 'left');
      join
        .on('users.id', '=', 'orders.user_id')
        .where('orders.status', 'active');

      expect(join.wheres).toHaveLength(2);
      expect(join.wheres[0].type).toBe('Column');
      expect(join.wheres[1].type).toBe('Basic');
      expect(join.getBindings()).toEqual(['active']);
    });

    it('supports multiple on clauses', () => {
      const join = new JoinClause('orders');
      join
        .on('a', '=', 'b')
        .on('c', '=', 'd')
        .orOn('e', '=', 'f');

      expect(join.wheres).toHaveLength(3);
    });
  });
});
