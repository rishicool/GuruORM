import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../../src/Support/Collection';

describe('Support / Collection — aggregates', () => {

  describe('sum', () => {
    it('sums numeric items', () => {
      expect(Collection.make([1, 2, 3]).sum()).toBe(6);
    });

    it('sums by key', () => {
      const c = Collection.make([{ price: 10 }, { price: 20 }]);
      expect(c.sum('price')).toBe(30);
    });

    it('sums by callback', () => {
      const c = Collection.make([{ price: 10, qty: 2 }, { price: 5, qty: 3 }]);
      expect(c.sum((i) => i.price * i.qty)).toBe(35);
    });

    it('returns 0 for empty', () => {
      expect(Collection.make().sum()).toBe(0);
    });
  });

  describe('avg', () => {
    it('average of numeric items', () => {
      expect(Collection.make([10, 20, 30]).avg()).toBe(20);
    });

    it('by key', () => {
      const c = Collection.make([{ score: 80 }, { score: 100 }]);
      expect(c.avg('score')).toBe(90);
    });

    it('returns 0 for empty', () => {
      expect(Collection.make().avg()).toBe(0);
    });
  });

  describe('min', () => {
    it('returns minimum value', () => {
      expect(Collection.make([5, 1, 9]).min()).toBe(1);
    });

    it('by key', () => {
      const c = Collection.make([{ age: 30 }, { age: 20 }, { age: 25 }]);
      expect(c.min('age')).toBe(20);
    });

    it('returns Infinity for empty', () => {
      expect(Collection.make().min()).toBe(Infinity);
    });
  });

  describe('max', () => {
    it('returns maximum value', () => {
      expect(Collection.make([5, 1, 9]).max()).toBe(9);
    });

    it('by key', () => {
      const c = Collection.make([{ age: 30 }, { age: 20 }]);
      expect(c.max('age')).toBe(30);
    });

    it('returns -Infinity for empty', () => {
      expect(Collection.make().max()).toBe(-Infinity);
    });
  });
});
