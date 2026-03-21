import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../../src/Support/Collection';

describe('Support / Collection — mutation', () => {

  describe('push', () => {
    it('adds items to end', () => {
      const c = Collection.make([1, 2]);
      c.push(3, 4);
      expect(c.all()).toEqual([1, 2, 3, 4]);
    });

    it('returns new length', () => {
      const c = Collection.make([1]);
      expect(c.push(2)).toBe(2);
    });
  });

  describe('forget', () => {
    it('removes item at index', () => {
      const c = Collection.make(['a', 'b', 'c']);
      c.forget(1);
      expect(c.all()).toEqual(['a', 'c']);
    });

    it('returns this for chaining', () => {
      const c = Collection.make([1, 2]);
      expect(c.forget(0)).toBe(c);
    });
  });

  describe('splice', () => {
    it('removes items at position', () => {
      const c = Collection.make([1, 2, 3, 4]);
      c.splice(1, 2);
      expect(c.all()).toEqual([1, 4]);
    });
  });

  describe('skip', () => {
    it('skips first n items', () => {
      const c = Collection.make([1, 2, 3, 4]);
      expect(c.skip(2).all()).toEqual([3, 4]);
    });
  });

  describe('take', () => {
    it('takes first n items', () => {
      const c = Collection.make([1, 2, 3, 4]);
      expect(c.take(2).all()).toEqual([1, 2]);
    });

    it('takes last n items with negative count', () => {
      const c = Collection.make([1, 2, 3, 4]);
      expect(c.take(-2).all()).toEqual([3, 4]);
    });
  });

  describe('slice', () => {
    it('returns Collection from start', () => {
      const c = Collection.make([1, 2, 3, 4]).slice(1);
      expect(c).toBeInstanceOf(Collection);
      expect(c.all()).toEqual([2, 3, 4]);
    });

    it('supports start and end', () => {
      expect(Collection.make([1, 2, 3, 4]).slice(1, 3).all()).toEqual([2, 3]);
    });
  });

  describe('chunk', () => {
    it('splits into chunks', () => {
      const c = Collection.make([1, 2, 3, 4, 5]);
      const chunks = c.chunk(2);

      expect(chunks.count()).toBe(3);
      expect(chunks.get(0)!.all()).toEqual([1, 2]);
      expect(chunks.get(1)!.all()).toEqual([3, 4]);
      expect(chunks.count()).toBe(3);
    });

    it('each chunk is a Collection', () => {
      const chunks = Collection.make([1, 2]).chunk(1);
      expect(chunks.get(0)).toBeInstanceOf(Collection);
    });
  });

  describe('zip', () => {
    it('zips with another array', () => {
      const c = Collection.make([1, 2, 3]);
      const zipped = c.zip(['a', 'b', 'c']);
      expect(zipped.all()).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    it('pads with undefined for mismatched lengths', () => {
      const c = Collection.make([1, 2]);
      const zipped = c.zip(['a']);
      expect(zipped.get(1)).toEqual([2, undefined]);
    });
  });
});
