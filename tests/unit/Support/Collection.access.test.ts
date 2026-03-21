import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../../src/Support/Collection';

describe('Support / Collection — creation & access', () => {

  // ── make ─────────────────────────────────────────────

  describe('make', () => {
    it('creates empty collection', () => {
      const c = Collection.make();
      expect(c).toBeInstanceOf(Collection);
      expect(c.count()).toBe(0);
    });

    it('creates from array', () => {
      const c = Collection.make([1, 2, 3]);
      expect(c.count()).toBe(3);
    });
  });

  // ── wrap ─────────────────────────────────────────────

  describe('wrap', () => {
    it('wraps array in collection', () => {
      const c = Collection.wrap([1, 2]);
      expect(c).toBeInstanceOf(Collection);
      expect(c.count()).toBe(2);
    });

    it('returns same collection if already a Collection', () => {
      const original = Collection.make([1]);
      const wrapped = Collection.wrap(original);
      expect(wrapped).toBe(original);
    });

    it('wraps single non-numeric value', () => {
      const c = Collection.wrap('hello');
      expect(c.count()).toBe(1);
      expect(c.first()).toBe('hello');
    });
  });

  // ── all ──────────────────────────────────────────────

  describe('all', () => {
    it('returns plain array', () => {
      const c = Collection.make([1, 2, 3]);
      const arr = c.all();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr).not.toBeInstanceOf(Collection);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  // ── get ──────────────────────────────────────────────

  describe('get', () => {
    it('returns item at index', () => {
      const c = Collection.make(['a', 'b', 'c']);
      expect(c.get(1)).toBe('b');
    });

    it('returns undefined for out-of-range', () => {
      const c = Collection.make([1]);
      expect(c.get(5)).toBeUndefined();
    });

    it('returns defaultValue for missing index', () => {
      const c = Collection.make<number>([]);
      expect(c.get(0, 99)).toBe(99);
    });
  });

  // ── first ────────────────────────────────────────────

  describe('first', () => {
    it('returns first element', () => {
      expect(Collection.make([10, 20]).first()).toBe(10);
    });

    it('returns undefined for empty collection', () => {
      expect(Collection.make().first()).toBeUndefined();
    });

    it('accepts predicate', () => {
      const c = Collection.make([1, 2, 3, 4]);
      expect(c.first((x) => x > 2)).toBe(3);
    });
  });

  // ── last ─────────────────────────────────────────────

  describe('last', () => {
    it('returns last element', () => {
      expect(Collection.make([1, 2, 3]).last()).toBe(3);
    });

    it('returns undefined for empty', () => {
      expect(Collection.make().last()).toBeUndefined();
    });

    it('accepts predicate', () => {
      const c = Collection.make([1, 2, 3, 4]);
      expect(c.last((x) => x < 3)).toBe(2);
    });
  });

  // ── pull ─────────────────────────────────────────────

  describe('pull', () => {
    it('gets and removes item at index', () => {
      const c = Collection.make(['a', 'b', 'c']);
      expect(c.pull(1)).toBe('b');
      expect(c.count()).toBe(2);
      expect(c.all()).toEqual(['a', 'c']);
    });
  });

  // ── pop ──────────────────────────────────────────────

  describe('pop', () => {
    it('removes and returns the last item', () => {
      const c = Collection.make([1, 2, 3]);
      expect(c.pop()).toBe(3);
      expect(c.count()).toBe(2);
    });

    it('returns undefined for empty collection', () => {
      expect(Collection.make().pop()).toBeUndefined();
    });
  });

  // ── isEmpty / isNotEmpty ────────────────────────────

  describe('isEmpty / isNotEmpty', () => {
    it('isEmpty returns true for empty', () => {
      expect(Collection.make().isEmpty()).toBe(true);
    });

    it('isEmpty returns false for non-empty', () => {
      expect(Collection.make([1]).isEmpty()).toBe(false);
    });

    it('isNotEmpty returns true for non-empty', () => {
      expect(Collection.make([1]).isNotEmpty()).toBe(true);
    });

    it('isNotEmpty returns false for empty', () => {
      expect(Collection.make().isNotEmpty()).toBe(false);
    });
  });

  // ── count ────────────────────────────────────────────

  describe('count', () => {
    it('returns number of items', () => {
      expect(Collection.make([1, 2, 3]).count()).toBe(3);
    });

    it('returns 0 for empty', () => {
      expect(Collection.make().count()).toBe(0);
    });
  });
});
