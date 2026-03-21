import { Collection } from '../../../src/Eloquent/Collection';
import { Model } from '../../../src/Eloquent/Model';

class TestModel extends Model {
  protected table = 'test';
  protected static fillable = ['id', 'name', 'secret'];
}

describe('Eloquent / Collection — expanded coverage', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
  });

  // ---- makeVisible / makeHidden with Model instances ----
  describe('makeVisible', () => {
    test('calls makeVisible on each Model item', () => {
      const m1 = new TestModel({ id: 1, name: 'A', secret: 'x' });
      const m2 = new TestModel({ id: 2, name: 'B', secret: 'y' });
      const col = new Collection(m1, m2);
      col.makeVisible(['secret']);
      // Should not throw
      expect(col).toHaveLength(2);
    });

    test('handles non-Model items gracefully', () => {
      const col = new Collection({ id: 1, name: 'A' } as any);
      expect(() => col.makeVisible('name')).not.toThrow();
    });
  });

  describe('makeHidden', () => {
    test('calls makeHidden on each Model item', () => {
      const m = new TestModel({ id: 1, name: 'A', secret: 'x' });
      const col = new Collection(m);
      col.makeHidden('secret');
      expect(col).toHaveLength(1);
    });

    test('handles non-Model items gracefully', () => {
      const col = new Collection({ id: 1 } as any);
      expect(() => col.makeHidden('id')).not.toThrow();
    });
  });

  // ---- load ----
  describe('load', () => {
    test('loads relations on Model items', async () => {
      const m = new TestModel({ id: 1 });
      (m as any).load = jest.fn().mockResolvedValue(m);
      const col = new Collection(m);
      await col.load('posts');
      expect((m as any).load).toHaveBeenCalledWith(['posts']);
    });

    test('handles array of relations', async () => {
      const m = new TestModel({ id: 1 });
      (m as any).load = jest.fn().mockResolvedValue(m);
      const col = new Collection(m);
      await col.load(['posts', 'comments']);
      expect((m as any).load).toHaveBeenCalledWith(['posts', 'comments']);
    });

    test('returns collection when empty', async () => {
      const col = new Collection();
      const result = await col.load('posts');
      expect(result).toBe(col);
    });
  });

  // ---- compareValues (protected, tested via contains with operator) ----
  describe('contains with operator', () => {
    test('= operator', () => {
      const col = Collection.make([{ age: 25 }, { age: 30 }]);
      expect(col.contains('age', '=', 25)).toBe(true);
      expect(col.contains('age', '=', 99)).toBe(false);
    });

    test('=== operator', () => {
      const col = Collection.make([{ age: '25' }]);
      expect(col.contains('age', '===', '25')).toBe(true);
      expect(col.contains('age', '===', 25)).toBe(false);
    });

    test('!= operator', () => {
      const col = Collection.make([{ age: 25 }]);
      expect(col.contains('age', '!=', 30)).toBe(true);
    });

    test('!== operator', () => {
      const col = Collection.make([{ age: '25' }]);
      expect(col.contains('age', '!==', 25)).toBe(true);
    });

    test('< operator', () => {
      const col = Collection.make([{ age: 20 }, { age: 30 }]);
      expect(col.contains('age', '<', 25)).toBe(true);
    });

    test('> operator', () => {
      const col = Collection.make([{ age: 30 }]);
      expect(col.contains('age', '>', 25)).toBe(true);
    });

    test('<= operator', () => {
      const col = Collection.make([{ age: 25 }]);
      expect(col.contains('age', '<=', 25)).toBe(true);
    });

    test('>= operator', () => {
      const col = Collection.make([{ age: 25 }]);
      expect(col.contains('age', '>=', 25)).toBe(true);
    });

    test('<> operator (alias for !=)', () => {
      const col = Collection.make([{ age: 25 }]);
      expect(col.contains('age', '<>', 30)).toBe(true);
    });

    test('unknown operator returns false', () => {
      const col = Collection.make([{ age: 25 }]);
      expect(col.contains('age', 'LIKE', '%x%')).toBe(false);
    });
  });

  // ---- contains with 2 args (key, value shorthand) ----
  describe('contains key-value shorthand', () => {
    test('matches by key and value', () => {
      const col = Collection.make([{ name: 'Alice' }, { name: 'Bob' }]);
      expect(col.contains('name', 'Alice')).toBe(true);
      expect(col.contains('name', 'Charlie')).toBe(false);
    });
  });

  // ---- unique ----
  describe('unique', () => {
    test('unique without key deduplicates by value', () => {
      const col = Collection.make([1, 2, 2, 3, 3, 3] as any[]);
      const result = col.unique();
      expect(result.length).toBe(3);
    });

    test('unique with key deduplicates by attribute', () => {
      const col = Collection.make([
        { type: 'a', id: 1 },
        { type: 'a', id: 2 },
        { type: 'b', id: 3 },
      ]);
      const result = col.unique('type');
      expect(result.length).toBe(2);
    });
  });

  // ---- getDictionary ----
  describe('getDictionary', () => {
    test('keyed by model primary key', () => {
      const m1 = new TestModel({ id: 1, name: 'A' });
      const m2 = new TestModel({ id: 2, name: 'B' });
      const col = new Collection(m1, m2);
      const dict = col.getDictionary();
      expect(dict['1'].getAttribute('name')).toBe('A');
      expect(dict['2'].getAttribute('name')).toBe('B');
    });

    test('keyed by custom key', () => {
      const m1 = new TestModel({ id: 1, name: 'A' });
      const m2 = new TestModel({ id: 2, name: 'B' });
      const col = new Collection(m1, m2);
      const dict = col.getDictionary('name');
      expect(dict['A'].getAttribute('id')).toBe(1);
      expect(dict['B'].getAttribute('id')).toBe(2);
    });

    test('keyed by property on plain objects', () => {
      const col = Collection.make([{ id: 1 }, { id: 2 }]);
      const dict = col.getDictionary('id');
      expect(dict['1']).toEqual({ id: 1 });
    });
  });

  // ---- toArray ----
  describe('toArray', () => {
    test('calls toArray on Model items', () => {
      const m = new TestModel({ id: 1, name: 'A' });
      const col = new Collection(m);
      const arr = col.toArray();
      expect(arr).toHaveLength(1);
      expect(arr[0]).toHaveProperty('id', 1);
      expect(arr[0]).toHaveProperty('name', 'A');
    });

    test('returns plain items as-is', () => {
      const col = Collection.make([{ id: 1 }]);
      const arr = col.toArray();
      expect(arr[0]).toEqual({ id: 1 });
    });
  });

  // ---- find with Model instances ----
  describe('find with Model', () => {
    test('finds model by primary key', () => {
      const m1 = new TestModel({ id: 1 });
      const m2 = new TestModel({ id: 2 });
      const col = new Collection(m1, m2);
      const found = col.find(2);
      expect(found).toBeDefined();
      expect(found!.getAttribute('id')).toBe(2);
    });

    test('returns undefined when not found', () => {
      const col = new Collection(new TestModel({ id: 1 }));
      expect(col.find(99)).toBeUndefined();
    });
  });

  // ---- modelKeys ----
  describe('modelKeys', () => {
    test('extracts keys from Models', () => {
      const col = new Collection(
        new TestModel({ id: 1 }),
        new TestModel({ id: 2 }),
      );
      const keys = col.modelKeys();
      expect(keys).toContain(1);
      expect(keys).toContain(2);
      expect(keys).toHaveLength(2);
    });

    test('extracts id from plain objects', () => {
      const col = Collection.make([{ id: 10 }, { id: 20 }]);
      expect(col.modelKeys()).toEqual([10, 20]);
    });
  });

  // ---- diff / intersect ----
  describe('diff', () => {
    test('returns items not in other collection', () => {
      const m1 = new TestModel({ id: 1 });
      const m2 = new TestModel({ id: 2 });
      const m3 = new TestModel({ id: 3 });
      const col = new Collection(m1, m2, m3);
      const other = new Collection(new TestModel({ id: 2 }));
      const diff = col.diff(other);
      expect(diff.length).toBe(2);
    });
  });

  describe('intersect', () => {
    test('returns items in both collections', () => {
      const m1 = new TestModel({ id: 1 });
      const m2 = new TestModel({ id: 2 });
      const m3 = new TestModel({ id: 3 });
      const col = new Collection(m1, m2, m3);
      const other = new Collection(new TestModel({ id: 2 }), new TestModel({ id: 3 }));
      const inter = col.intersect(other);
      expect(inter.length).toBe(2);
    });
  });

  // ---- contains with Model ----
  describe('contains with Model', () => {
    test('checks by model key', () => {
      const m = new TestModel({ id: 1 });
      const col = new Collection(m);
      expect(col.contains(1)).toBe(true);
      expect(col.contains(99)).toBe(false);
    });
  });
});
