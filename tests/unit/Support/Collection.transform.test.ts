import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../../src/Support/Collection';

describe('Support / Collection — transform', () => {

  describe('map', () => {
    it('returns Collection, not plain Array', () => {
      const c = Collection.make([1, 2, 3]).map((x) => x * 2);
      expect(c).toBeInstanceOf(Collection);
      expect(c.all()).toEqual([2, 4, 6]);
    });

    it('receives item and index', () => {
      const c = Collection.make(['a', 'b']).map((item, idx) => `${idx}:${item}`);
      expect(c.all()).toEqual(['0:a', '1:b']);
    });
  });

  describe('each', () => {
    it('iterates all items', () => {
      const items: number[] = [];
      Collection.make([1, 2, 3]).each((item) => { items.push(item); });
      expect(items).toEqual([1, 2, 3]);
    });

    it('stops when callback returns false', () => {
      const items: number[] = [];
      Collection.make([1, 2, 3, 4]).each((item) => {
        items.push(item);
        if (item === 2) return false;
      });
      expect(items).toEqual([1, 2]);
    });

    it('returns this for chaining', () => {
      const c = Collection.make([1]);
      expect(c.each(() => {})).toBe(c);
    });
  });

  describe('reduce', () => {
    it('reduces to a single value', () => {
      const result = Collection.make([1, 2, 3]).reduce((carry, item) => carry + item, 0);
      expect(result).toBe(6);
    });

    it('respects initial value', () => {
      const result = Collection.make([1, 2]).reduce((carry, item) => carry + item, 10);
      expect(result).toBe(13);
    });
  });

  describe('pluck', () => {
    it('extracts values by key', () => {
      const c = Collection.make([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(c.pluck('name').all()).toEqual(['Alice', 'Bob']);
    });

    it('returns Collection', () => {
      expect(Collection.make([{ x: 1 }]).pluck('x')).toBeInstanceOf(Collection);
    });
  });

  describe('groupBy', () => {
    it('groups by string key', () => {
      const c = Collection.make([
        { dept: 'eng', name: 'Alice' },
        { dept: 'hr', name: 'Bob' },
        { dept: 'eng', name: 'Charlie' },
      ]);

      const groups = c.groupBy('dept');
      expect(groups).toBeInstanceOf(Collection);
    });

    it('groups by callback', () => {
      const c = Collection.make([1, 2, 3, 4, 5]);
      const groups = c.groupBy((n) => (n % 2 === 0 ? 'even' : 'odd'));
      expect(groups).toBeInstanceOf(Collection);
    });
  });

  describe('flatten', () => {
    it('flattens nested arrays', () => {
      const c = Collection.make([[1, 2], [3, 4]]);
      expect(c.flatten().all()).toEqual([1, 2, 3, 4]);
    });

    it('respects depth parameter', () => {
      const c = Collection.make([[[1]], [[2]]]);
      const flat1 = c.flatten(1);
      expect(flat1.all()).toEqual([[1], [2]]);
    });
  });

  describe('collapse', () => {
    it('collapses nested arrays', () => {
      const c = Collection.make([[1, 2], [3], [4, 5]]);
      expect(c.collapse().all()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('flip', () => {
    it('swaps keys and values', () => {
      const c = Collection.make(['a', 'b', 'c']);
      const flipped = c.flip();
      expect(flipped).toBeInstanceOf(Collection);
    });
  });

  describe('toArray', () => {
    it('returns plain array', () => {
      const arr = Collection.make([1, 2]).toArray();
      expect(arr).toEqual([1, 2]);
      expect(arr).not.toBeInstanceOf(Collection);
    });
  });

  describe('toJSON', () => {
    it('returns plain array for JSON serialization', () => {
      const c = Collection.make([{ a: 1 }]);
      expect(c.toJSON()).toEqual([{ a: 1 }]);
    });

    it('works with JSON.stringify', () => {
      const c = Collection.make([1, 2]);
      expect(JSON.parse(JSON.stringify(c))).toEqual([1, 2]);
    });
  });
});
