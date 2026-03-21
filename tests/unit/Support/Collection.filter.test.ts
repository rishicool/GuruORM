import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../../src/Support/Collection';

describe('Support / Collection — filter & search', () => {

  describe('where', () => {
    const users = Collection.make([
      { name: 'Alice', age: 25, role: 'admin' },
      { name: 'Bob', age: 30, role: 'user' },
      { name: 'Charlie', age: 35, role: 'admin' },
    ]);

    it('filters by key-value', () => {
      const admins = users.where('role', 'admin');
      expect(admins.count()).toBe(2);
    });

    it('supports > operator', () => {
      const result = users.where('age', '>', 25);
      expect(result.count()).toBe(2);
    });

    it('supports < operator', () => {
      const result = users.where('age', '<', 30);
      expect(result.count()).toBe(1);
    });

    it('supports >= operator', () => {
      const result = users.where('age', '>=', 30);
      expect(result.count()).toBe(2);
    });

    it('supports <= operator', () => {
      const result = users.where('age', '<=', 30);
      expect(result.count()).toBe(2);
    });

    it('supports != operator', () => {
      const result = users.where('role', '!=', 'admin');
      expect(result.count()).toBe(1);
    });

    it('returns Collection', () => {
      expect(users.where('role', 'admin')).toBeInstanceOf(Collection);
    });
  });

  describe('reject', () => {
    it('removes items matching predicate', () => {
      const c = Collection.make([1, 2, 3, 4]);
      const result = c.reject((x) => x % 2 === 0);
      expect(result.all()).toEqual([1, 3]);
    });

    it('returns Collection', () => {
      expect(Collection.make([1]).reject(() => false)).toBeInstanceOf(Collection);
    });
  });

  describe('contains', () => {
    it('checks for value', () => {
      const c = Collection.make([1, 2, 3]);
      expect(c.contains(2)).toBe(true);
      expect(c.contains(5)).toBe(false);
    });

    it('accepts predicate', () => {
      const c = Collection.make([{ active: true }, { active: false }]);
      expect(c.contains((item) => item.active)).toBe(true);
    });
  });

  describe('unique', () => {
    it('removes duplicates from primitives', () => {
      const c = Collection.make([1, 2, 2, 3, 3, 3]);
      expect(c.unique().all()).toEqual([1, 2, 3]);
    });

    it('unique by key', () => {
      const c = Collection.make([
        { dept: 'eng', name: 'A' },
        { dept: 'eng', name: 'B' },
        { dept: 'hr', name: 'C' },
      ]);
      expect(c.unique('dept').count()).toBe(2);
    });

    it('unique by callback', () => {
      const c = Collection.make([1, 2, 3, 4, 5]);
      const result = c.unique((n) => n % 3);
      expect(result.count()).toBe(3);
    });
  });

  describe('diff', () => {
    it('returns items not in given array', () => {
      const c = Collection.make([1, 2, 3, 4]);
      expect(c.diff([2, 4]).all()).toEqual([1, 3]);
    });
  });

  describe('except', () => {
    it('excludes specified keys from objects', () => {
      const c = Collection.make([{ id: 1, name: 'A', password: 'x' }]);
      const result = c.except('password');
      expect(result.first()).toEqual({ id: 1, name: 'A' });
    });
  });

  describe('only', () => {
    it('keeps only specified keys', () => {
      const c = Collection.make([{ id: 1, name: 'A', email: 'a@b.com' }]);
      const result = c.only('id', 'name');
      expect(result.first()).toEqual({ id: 1, name: 'A' });
    });
  });
});
