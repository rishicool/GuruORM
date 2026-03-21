import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../../src/Support/Collection';

describe('Support / Collection — sort', () => {

  describe('sort', () => {
    it('sorts primitives', () => {
      const c = Collection.make([3, 1, 2]);
      expect(c.sort().all()).toEqual([1, 2, 3]);
    });

    it('accepts custom comparator', () => {
      const c = Collection.make([3, 1, 2]);
      expect(c.sort((a, b) => b - a).all()).toEqual([3, 2, 1]);
    });

    it('returns Collection', () => {
      expect(Collection.make([1]).sort()).toBeInstanceOf(Collection);
    });
  });

  describe('sortBy', () => {
    it('sorts by key', () => {
      const c = Collection.make([
        { name: 'Charlie', age: 35 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ]);
      const sorted = c.sortBy('age');
      expect(sorted.pluck('name').all()).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts by callback', () => {
      const c = Collection.make([{ x: 3 }, { x: 1 }, { x: 2 }]);
      expect(c.sortBy((i) => i.x).pluck('x').all()).toEqual([1, 2, 3]);
    });
  });

  describe('sortDesc', () => {
    it('sorts descending', () => {
      const c = Collection.make([1, 3, 2]);
      expect(c.sortDesc().all()).toEqual([3, 2, 1]);
    });
  });

  describe('reverse', () => {
    it('reverses order', () => {
      const c = Collection.make([1, 2, 3]);
      expect(c.reverse().all()).toEqual([3, 2, 1]);
    });

    it('returns Collection', () => {
      expect(Collection.make([1]).reverse()).toBeInstanceOf(Collection);
    });
  });

  describe('shuffle', () => {
    it('returns Collection of same length', () => {
      const c = Collection.make([1, 2, 3, 4, 5]);
      const shuffled = c.shuffle();
      expect(shuffled).toBeInstanceOf(Collection);
      expect(shuffled.count()).toBe(5);
    });

    it('contains all original elements', () => {
      const c = Collection.make([1, 2, 3]);
      const shuffled = c.shuffle();
      expect(shuffled.sort().all()).toEqual([1, 2, 3]);
    });
  });
});
