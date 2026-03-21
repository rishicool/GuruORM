import { Collection } from '../../../src/Eloquent/Collection';
import { Model } from '../../../src/Eloquent/Model';

describe('Eloquent / Collection', () => {
  // Simple mock models using plain objects with id
  function makeItem(id: number, extra: Record<string, any> = {}) {
    return { id, ...extra };
  }

  describe('static make()', () => {
    test('creates collection from array', () => {
      const c = Collection.make([1, 2, 3]);
      expect(c).toBeInstanceOf(Collection);
      expect(c.length).toBe(3);
    });

    test('creates empty collection', () => {
      const c = Collection.make();
      expect(c.isEmpty()).toBe(true);
    });
  });

  describe('all()', () => {
    test('returns plain array copy', () => {
      const c = Collection.make([1, 2]);
      const arr = c.all();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr).not.toBe(c);
      expect(arr).toEqual([1, 2]);
    });
  });

  describe('first() / last()', () => {
    test('returns first and last items', () => {
      const c = Collection.make([10, 20, 30]);
      expect(c.first()).toBe(10);
      expect(c.last()).toBe(30);
    });

    test('returns undefined for empty', () => {
      const c = Collection.make<number>();
      expect(c.first()).toBeUndefined();
      expect(c.last()).toBeUndefined();
    });
  });

  describe('isEmpty() / isNotEmpty()', () => {
    test('empty collection', () => {
      const c = Collection.make();
      expect(c.isEmpty()).toBe(true);
      expect(c.isNotEmpty()).toBe(false);
    });

    test('non-empty collection', () => {
      const c = Collection.make([1]);
      expect(c.isEmpty()).toBe(false);
      expect(c.isNotEmpty()).toBe(true);
    });
  });

  describe('toArray()', () => {
    test('returns plain array', () => {
      const c = Collection.make([1, 2]);
      expect(c.toArray()).toEqual([1, 2]);
    });

    test('calls toArray on items that have it', () => {
      const item = { toArray: () => ({ id: 1, name: 'test' }) };
      const c = Collection.make([item]);
      expect(c.toArray()).toEqual([{ id: 1, name: 'test' }]);
    });
  });

  describe('toJSON()', () => {
    test('returns same as toArray()', () => {
      const c = Collection.make([1, 2]);
      expect(c.toJSON()).toEqual(c.toArray());
    });
  });

  describe('find()', () => {
    test('finds item by id', () => {
      const items = [makeItem(1), makeItem(2), makeItem(3)];
      const c = Collection.make(items);
      expect(c.find(2)).toBe(items[1]);
    });

    test('returns undefined when not found', () => {
      const c = Collection.make([makeItem(1)]);
      expect(c.find(999)).toBeUndefined();
    });
  });

  describe('modelKeys()', () => {
    test('returns array of ids', () => {
      const c = Collection.make([makeItem(1), makeItem(2)]);
      expect(c.modelKeys()).toEqual([1, 2]);
    });
  });

  describe('contains()', () => {
    test('checks by value', () => {
      const c = Collection.make([1, 2, 3]);
      expect(c.contains(1)).toBe(true);
      expect(c.contains(99)).toBe(false);
    });

    test('checks by attribute with operator', () => {
      const c = Collection.make([makeItem(1, { name: 'Alice' }), makeItem(2, { name: 'Bob' })]);
      expect(c.contains('name', '=', 'Alice')).toBe(true);
      expect(c.contains('name', '=', 'Charlie')).toBe(false);
    });

    test('checks by attribute without operator (2 args)', () => {
      const c = Collection.make([makeItem(1, { name: 'Alice' })]);
      expect(c.contains('name', 'Alice' as any)).toBe(true);
    });
  });

  describe('unique()', () => {
    test('removes duplicate primitives', () => {
      const c = Collection.make([1, 2, 2, 3]);
      expect(c.unique().all()).toEqual([1, 2, 3]);
    });

    test('unique by key', () => {
      const items = [makeItem(1, { type: 'a' }), makeItem(2, { type: 'a' }), makeItem(3, { type: 'b' })];
      const c = Collection.make(items);
      expect(c.unique('type').length).toBe(2);
    });
  });

  describe('diff()', () => {
    test('returns items not in other collection', () => {
      const c1 = Collection.make([makeItem(1), makeItem(2), makeItem(3)]);
      const c2 = Collection.make([makeItem(2)]);
      const diff = c1.diff(c2);
      expect(diff.modelKeys()).toEqual([1, 3]);
    });
  });

  describe('intersect()', () => {
    test('returns items in both collections', () => {
      const c1 = Collection.make([makeItem(1), makeItem(2), makeItem(3)]);
      const c2 = Collection.make([makeItem(2), makeItem(3)]);
      const intersect = c1.intersect(c2);
      expect(intersect.modelKeys()).toEqual([2, 3]);
    });
  });

  describe('getDictionary()', () => {
    test('creates dictionary keyed by id', () => {
      const items = [makeItem(1), makeItem(2)];
      const c = Collection.make(items);
      const dict = c.getDictionary();
      expect(dict['1']).toBe(items[0]);
      expect(dict['2']).toBe(items[1]);
    });

    test('creates dictionary keyed by custom key', () => {
      const items = [makeItem(1, { slug: 'foo' }), makeItem(2, { slug: 'bar' })];
      const c = Collection.make(items);
      const dict = c.getDictionary('slug');
      expect(dict['foo']).toBe(items[0]);
      expect(dict['bar']).toBe(items[1]);
    });
  });

  describe('only()', () => {
    test('returns only matching ids', () => {
      const c = Collection.make([makeItem(1), makeItem(2), makeItem(3)]);
      expect(c.only([1, 3]).modelKeys()).toEqual([1, 3]);
    });
  });

  describe('except()', () => {
    test('excludes matching ids', () => {
      const c = Collection.make([makeItem(1), makeItem(2), makeItem(3)]);
      expect(c.except([2]).modelKeys()).toEqual([1, 3]);
    });
  });

  describe('mapInto()', () => {
    test('maps items into class instances', () => {
      class Wrapper {
        value: any;
        constructor(v: any) { this.value = v; }
      }
      const c = Collection.make([1, 2, 3]);
      const mapped = c.mapInto(Wrapper);
      expect(mapped).toBeInstanceOf(Collection);
      expect(mapped[0]).toBeInstanceOf(Wrapper);
      expect(mapped[0].value).toBe(1);
    });
  });

  describe('fresh()', () => {
    test('returns self when empty', async () => {
      const c = Collection.make<any>();
      expect(await c.fresh()).toBe(c);
    });

    test('returns self when first item is not a Model', async () => {
      const c = Collection.make([{ id: 1 }]);
      expect(await c.fresh()).toBe(c);
    });
  });

  describe('load()', () => {
    test('returns self when empty', async () => {
      const c = Collection.make<any>();
      expect(await c.load('posts')).toBe(c);
    });
  });
});
