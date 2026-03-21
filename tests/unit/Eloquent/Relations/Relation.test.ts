import { HasMany } from '../../../../src/Eloquent/Relations/HasMany';
import { Model } from '../../../../src/Eloquent/Model';

// Use HasMany as a concrete implementation to test base Relation methods

function mockModel(attrs: Record<string, any> = {}, exists = false) {
  const m = Object.create(Model.prototype);
  m.attributes = { ...attrs };
  m.relations = {};
  m.exists = exists;
  m.getAttribute = (key: string) => m.attributes[key];
  m.setAttribute = (key: string, val: any) => { m.attributes[key] = val; };
  m.modelExists = () => exists;
  m.getTable = () => 'test_table';
  return m;
}

function mockQuery() {
  const q: any = {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNotIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    whereNotBetween: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orWhereRaw: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    orderByRaw: jest.fn().mockReturnThis(),
    latest: jest.fn().mockReturnThis(),
    oldest: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue(5),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    model: mockModel({ id: 1 }),
    getModel: jest.fn().mockReturnValue(mockModel({ id: 1 })),
    wheres: [],
  };
  return q;
}

function createRelation(query?: any) {
  const q = query || mockQuery();
  const parent = mockModel({ id: 1 }, false);
  return new HasMany(q, parent, 'parent_id', 'id');
}

describe('Eloquent / Relations / Relation (base)', () => {
  describe('accessors', () => {
    test('getQuery returns the query builder', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      expect(rel.getQuery()).toBe(q);
    });

    test('getParent returns parent model', () => {
      const q = mockQuery();
      const parent = mockModel({ id: 42 }, false);
      const rel = new HasMany(q, parent, 'p_id', 'id');
      expect(rel.getParent()).toBe(parent);
    });

    test('getRelated returns query model', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      const related = rel.getRelated();
      // The related model is set from query.getModel() during construction
      expect(related.getAttribute('id')).toBe(1);
    });
  });

  describe('query delegation', () => {
    test('where delegates to query and returns this', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      expect(rel.where('col', '=', 'val')).toBe(rel);
      expect(q.where).toHaveBeenCalledWith('col', '=', 'val');
    });

    test('whereRaw delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereRaw('col > ?', [5]);
      expect(q.whereRaw).toHaveBeenCalledWith('col > ?', [5], 'and');
    });

    test('orWhere delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.orWhere('x', 1);
      expect(q.orWhere).toHaveBeenCalledWith('x', 1);
    });

    test('orWhereRaw delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.orWhereRaw('x > ?', [1]);
      expect(q.orWhereRaw).toHaveBeenCalledWith('x > ?', [1]);
    });

    test('whereIn delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereIn('id', [1, 2]);
      expect(q.whereIn).toHaveBeenCalledWith('id', [1, 2]);
    });

    test('whereNotIn delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereNotIn('id', [3]);
      expect(q.whereNotIn).toHaveBeenCalledWith('id', [3]);
    });

    test('whereNull delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereNull('deleted_at');
      expect(q.whereNull).toHaveBeenCalledWith('deleted_at');
    });

    test('whereNotNull delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereNotNull('email');
      expect(q.whereNotNull).toHaveBeenCalledWith('email');
    });

    test('whereBetween delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereBetween('age', [18, 65]);
      expect(q.whereBetween).toHaveBeenCalledWith('age', [18, 65]);
    });

    test('whereNotBetween delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.whereNotBetween('age', [0, 17]);
      expect(q.whereNotBetween).toHaveBeenCalledWith('age', [0, 17]);
    });

    test('orderBy delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.orderBy('name', 'asc');
      expect(q.orderBy).toHaveBeenCalledWith('name', 'asc');
    });

    test('orderByRaw delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.orderByRaw('FIELD(id, ?)', [1]);
      expect(q.orderByRaw).toHaveBeenCalledWith('FIELD(id, ?)', [1]);
    });

    test('latest delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.latest();
      expect(q.latest).toHaveBeenCalledWith('created_at');
    });

    test('oldest delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.oldest('updated_at');
      expect(q.oldest).toHaveBeenCalledWith('updated_at');
    });

    test('select delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.select('id', 'name');
      expect(q.select).toHaveBeenCalledWith('id', 'name');
    });

    test('limit delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.limit(10);
      expect(q.limit).toHaveBeenCalledWith(10);
    });

    test('offset delegates', () => {
      const q = mockQuery();
      const rel = createRelation(q);
      rel.offset(20);
      expect(q.offset).toHaveBeenCalledWith(20);
    });
  });

  describe('async operations', () => {
    test('get() returns query results', async () => {
      const q = mockQuery();
      q.get.mockResolvedValue([{ id: 1 }]);
      const rel = createRelation(q);
      const result = await rel.get();
      expect(result).toEqual([{ id: 1 }]);
    });

    test('first() returns first result', async () => {
      const q = mockQuery();
      q.first.mockResolvedValue({ id: 1 });
      const rel = createRelation(q);
      expect(await rel.first()).toEqual({ id: 1 });
    });

    test('count() returns count', async () => {
      const rel = createRelation();
      expect(await rel.count()).toBe(5);
    });
  });

  describe('thenable', () => {
    test('then() makes relation awaitable', async () => {
      const q = mockQuery();
      q.get.mockResolvedValue([{ id: 1 }]);
      const rel = createRelation(q);
      // then() calls getResults → query.get()
      const result = await (rel as unknown as Promise<any>);
      expect(result).toBeDefined();
    });

    test('catch() propagates errors', async () => {
      const q = mockQuery();
      q.get.mockRejectedValue(new Error('fail'));
      const rel = createRelation(q);
      await expect(rel.catch((e: Error) => e.message)).resolves.toBe('fail');
    });
  });

  describe('soft delete handling', () => {
    test('withTrashed() sets flag', () => {
      const rel = createRelation();
      expect(rel.withTrashed()).toBe(rel);
    });

    test('onlyTrashed() sets flag', () => {
      const rel = createRelation();
      expect(rel.onlyTrashed()).toBe(rel);
    });

    test('withoutTrashed() resets flags', () => {
      const rel = createRelation();
      rel.withTrashed();
      expect(rel.withoutTrashed()).toBe(rel);
    });
  });
});
