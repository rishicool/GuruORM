import { Builder } from '../../../src/Eloquent/Builder';
import { Collection } from '../../../src/Eloquent/Collection';
import { Model } from '../../../src/Eloquent/Model';
import { ModelNotFoundException, RelationNotFoundException } from '../../../src/Errors/GuruORMError';

class TestModel extends Model {
  protected table = 'test_models';
  protected static fillable = ['name', 'email'];
}

function mockQueryBuilder() {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue(true),
    insertGetId: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
    pluck: jest.fn().mockResolvedValue([]),
    toSql: jest.fn().mockReturnValue('SELECT * FROM test_models'),
    getBindings: jest.fn().mockReturnValue([]),
    columns: [],
    newQuery: jest.fn(),
    selectRaw: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
  } as any;
}

describe('Eloquent / Builder', () => {
  let builder: Builder;
  let qb: any;

  beforeEach(() => {
    (Model as any).booted = new Map();
    qb = mockQueryBuilder();
    builder = new Builder(qb);
    builder.setModel(new TestModel());
  });

  describe('setModel / getModel', () => {
    test('sets and gets model', () => {
      expect(builder.getModel()).toBeInstanceOf(TestModel);
    });

    test('sets query from model table', () => {
      expect(qb.from).toHaveBeenCalledWith('test_models');
    });
  });

  describe('getQuery', () => {
    test('returns underlying query builder', () => {
      expect(builder.getQuery()).toBe(qb);
    });
  });

  describe('find', () => {
    test('finds by primary key', async () => {
      qb.get.mockResolvedValue([{ id: 1, name: 'Alice' }]);
      const result = await builder.find(1);
      expect(qb.where).toHaveBeenCalled();
    });

    test('findMany with array of ids', async () => {
      qb.get.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await builder.find([1, 2]);
      expect(qb.whereIn).toHaveBeenCalled();
    });

    test('findMany with empty array returns empty collection', async () => {
      const result = await builder.find([]);
      expect(result).toBeInstanceOf(Collection);
    });
  });

  describe('findOrFail', () => {
    test('returns model when found', async () => {
      qb.get.mockResolvedValue([{ id: 1, name: 'A' }]);
      const result = await builder.findOrFail(1);
      expect(result).toBeDefined();
    });

    test('throws ModelNotFoundException when not found', async () => {
      qb.get.mockResolvedValue([]);
      await expect(builder.findOrFail(999)).rejects.toThrow(ModelNotFoundException);
    });

    test('throws when single result not found', async () => {
      qb.get.mockResolvedValue([]);
      await expect(builder.findOrFail(999)).rejects.toThrow(ModelNotFoundException);
    });
  });

  describe('first / firstOrFail', () => {
    test('first returns first result', async () => {
      qb.get.mockResolvedValue([{ id: 1, name: 'Alice' }]);
      const result = await builder.first();
      expect(result).not.toBeNull();
    });

    test('first returns null when empty', async () => {
      qb.get.mockResolvedValue([]);
      const result = await builder.first();
      expect(result).toBeNull();
    });

    test('firstOrFail throws when not found', async () => {
      qb.get.mockResolvedValue([]);
      await expect(builder.firstOrFail()).rejects.toThrow(ModelNotFoundException);
    });
  });

  describe('firstOr', () => {
    test('returns model when found', async () => {
      qb.get.mockResolvedValue([{ id: 1 }]);
      const result = await builder.firstOr();
      expect(result).toBeDefined();
    });

    test('calls callback when not found', async () => {
      qb.get.mockResolvedValue([]);
      const result = await builder.firstOr(['*'], () => 'fallback');
      expect(result).toBe('fallback');
    });

    test('returns new model instance when not found and no callback', async () => {
      qb.get.mockResolvedValue([]);
      const result = await builder.firstOr();
      expect(result).toBeInstanceOf(TestModel);
    });
  });

  describe('get', () => {
    test('returns Collection of models', async () => {
      qb.get.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
      const result = await builder.get();
      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
    });
  });

  describe('hydrate', () => {
    test('creates model instances from plain objects', () => {
      const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
      const result = builder.hydrate(items);
      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
    });
  });

  describe('pluck', () => {
    test('returns array of column values', async () => {
      qb.pluck.mockResolvedValue(['Alice', 'Bob']);
      const result = await builder.pluck('name');
      expect(result).toEqual(['Alice', 'Bob']);
    });
  });

  describe('with (eager loading)', () => {
    test('with string relation', () => {
      const result = builder.with('posts');
      expect(result).toBe(builder);
    });

    test('with array of relations', () => {
      builder.with(['posts', 'comments']);
      // Should not throw
    });

    test('with object of relation constraints', () => {
      builder.with({ posts: (q: any) => q.where('active', true) });
      // Should not throw
    });
  });

  describe('withCount / withAggregate', () => {
    test('withCount is a method on builder', () => {
      expect(typeof builder.withCount).toBe('function');
    });
  });

  describe('newModelInstance', () => {
    test('creates new model with attributes', () => {
      const instance = builder.newModelInstance({ name: 'Test' });
      expect(instance.getAttribute('name')).toBe('Test');
    });

    test('creates existing model instance', () => {
      const instance = builder.newModelInstance({ id: 1 }, true);
      expect(instance.modelExists()).toBe(true);
    });
  });

  describe('query delegation via __call', () => {
    test('where is delegated', () => {
      builder.where('name', 'Alice');
      expect(qb.where).toHaveBeenCalled();
    });

    test('orderBy is delegated', () => {
      builder.orderBy('name');
      expect(qb.orderBy).toHaveBeenCalled();
    });

    test('select is delegated', () => {
      builder.select('id', 'name');
      expect(qb.select).toHaveBeenCalled();
    });
  });
});
