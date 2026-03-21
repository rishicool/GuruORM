import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — orderBy', () => {

  describe('orderBy', () => {
    it('ascending (default)', () => {
      const { builder } = createBuilder('users');
      builder.orderBy('name');
      expect(builder.toSql()).toContain('order by `name` asc');
    });

    it('explicit ascending', () => {
      const { builder } = createBuilder('users');
      builder.orderBy('name', 'asc');
      expect(builder.toSql()).toContain('order by `name` asc');
    });

    it('explicit descending', () => {
      const { builder } = createBuilder('users');
      builder.orderBy('name', 'desc');
      expect(builder.toSql()).toContain('order by `name` desc');
    });

    it('multiple orderBy calls chain', () => {
      const { builder } = createBuilder('users');
      builder.orderBy('last_name').orderBy('first_name');

      const sql = builder.toSql();
      expect(sql).toContain('`last_name` asc');
      expect(sql).toContain('`first_name` asc');
    });
  });

  describe('orderByDesc', () => {
    it('shortcut for desc', () => {
      const { builder } = createBuilder('users');
      builder.orderByDesc('created_at');
      expect(builder.toSql()).toContain('order by `created_at` desc');
    });
  });

  describe('latest', () => {
    it('orders by created_at desc', () => {
      const { builder } = createBuilder('users');
      builder.latest();
      expect(builder.toSql()).toContain('order by `created_at` desc');
    });

    it('accepts custom column', () => {
      const { builder } = createBuilder('users');
      builder.latest('updated_at');
      expect(builder.toSql()).toContain('order by `updated_at` desc');
    });
  });

  describe('oldest', () => {
    it('orders by created_at asc', () => {
      const { builder } = createBuilder('users');
      builder.oldest();
      expect(builder.toSql()).toContain('order by `created_at` asc');
    });

    it('accepts custom column', () => {
      const { builder } = createBuilder('users');
      builder.oldest('registered_at');
      expect(builder.toSql()).toContain('order by `registered_at` asc');
    });
  });

  describe('inRandomOrder', () => {
    it('adds random order', () => {
      const { builder } = createBuilder('users');
      builder.inRandomOrder();
      expect(builder.toSql()).toContain('order by');
    });
  });

  describe('reorder', () => {
    it('clears existing orders', () => {
      const { builder } = createBuilder('users');
      builder.orderBy('name').reorder();

      expect(builder.toSql()).not.toContain('order by');
    });

    it('clears and sets new order', () => {
      const { builder } = createBuilder('users');
      builder.orderBy('name').reorder('id');

      const sql = builder.toSql();
      expect(sql).toContain('`id`');
      expect(sql).not.toContain('`name`');
    });
  });

  describe('orderByRaw', () => {
    it('adds raw SQL order clause', () => {
      const { builder } = createBuilder('users');
      builder.orderByRaw('FIELD(status, ?, ?, ?)', ['active', 'pending', 'banned']);

      expect(builder.toSql()).toContain('FIELD(status, ?, ?, ?)');
      expect(builder.getBindings()).toEqual(['active', 'pending', 'banned']);
    });
  });
});
