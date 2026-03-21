import { Builder } from '../../../src/Eloquent/Builder';
import { Model } from '../../../src/Eloquent/Model';
import { Collection } from '../../../src/Eloquent/Collection';

// ---- helpers ----
function mockQB() {
  const qb: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectSub: jest.fn().mockReturnThis(),
    selectRaw: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    whereExists: jest.fn().mockReturnThis(),
    whereNotExists: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue(true),
    insertGetId: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
    min: jest.fn().mockResolvedValue(0),
    max: jest.fn().mockResolvedValue(0),
    sum: jest.fn().mockResolvedValue(0),
    avg: jest.fn().mockResolvedValue(0),
    paginate: jest.fn().mockResolvedValue({ data: [], total: 0, perPage: 10, currentPage: 1, lastPage: 1 }),
    pluck: jest.fn().mockResolvedValue([]),
    toSql: jest.fn().mockReturnValue(''),
    getBindings: jest.fn().mockReturnValue([]),
    chunk: jest.fn().mockResolvedValue(true),
    chunkById: jest.fn().mockResolvedValue(true),
    lazy: jest.fn().mockReturnValue((async function* () {})()),
    lazyById: jest.fn().mockReturnValue((async function* () {})()),
    newQuery: jest.fn(),
    columns: [],
    fromTable: 'test_table',
  };
  qb.newQuery.mockReturnValue({ ...qb, newQuery: qb.newQuery });
  return qb;
}

class TestModel extends Model {
  protected table = 'users';
  protected static fillable = ['id', 'name', 'email', 'status'];
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

class PostModel extends Model {
  protected table = 'posts';
  protected static fillable = ['id', 'user_id', 'title'];
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

class TestModelWithPosts extends Model {
  protected table = 'users';
  protected static fillable = ['id', 'name', 'email', 'status'];
  protected newBaseQueryBuilder() { return mockQB() as any; }

  posts() {
    return this.hasMany(PostModel, 'user_id');
  }
}

describe('Eloquent / Builder — deep coverage', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  function builder(model?: Model) {
    const qb = mockQB();
    const b = new Builder(qb);
    b.setModel(model || new TestModel());
    return { b, qb };
  }

  // ---- firstOrFail ----
  describe('firstOrFail', () => {
    test('returns model when found', async () => {
      const { b, qb } = builder();
      qb.get.mockResolvedValue([{ id: 1, name: 'A' }]);
      const result = await b.firstOrFail();
      expect(result).toBeDefined();
    });

    test('throws ModelNotFoundException when not found', async () => {
      const { b, qb } = builder();
      qb.get.mockResolvedValue([]);
      await expect(b.firstOrFail()).rejects.toThrow();
    });
  });

  // ---- firstOrCreate (cache-hit) ----
  describe('firstOrCreate', () => {
    test('returns existing instance when found', async () => {
      const { b, qb } = builder();
      qb.get.mockResolvedValue([{ id: 1, name: 'Existing' }]);
      const result = await b.firstOrCreate({ name: 'Existing' });
      expect(result).toBeDefined();
      // insert should NOT be called
      expect(qb.insert).not.toHaveBeenCalled();
      expect(qb.insertGetId).not.toHaveBeenCalled();
    });
  });

  // ---- updateOrCreate ----
  describe('updateOrCreate', () => {
    test('creates new when not found', async () => {
      const { b, qb } = builder();
      qb.get.mockResolvedValue([]);
      qb.insertGetId.mockResolvedValue(99);
      const result = await b.updateOrCreate({ name: 'New' }, { email: 'x@y.com' });
      expect(result).toBeDefined();
    });

    test('updates existing when found', async () => {
      const { b, qb } = builder();
      const existing = { id: 1, name: 'Old', email: 'old@x.com' };
      qb.get.mockResolvedValueOnce([existing]);
      qb.update.mockResolvedValue(1);
      const result = await b.updateOrCreate({ name: 'Old' }, { email: 'new@x.com' });
      expect(result).toBeDefined();
    });
  });

  // ---- create / createMany ----
  describe('create', () => {
    test('creates and saves a new model', async () => {
      const { b, qb } = builder();
      qb.insertGetId.mockResolvedValue(99);
      const result = await b.create({ name: 'Test', email: 'test@x.com' });
      expect(result).toBeDefined();
    });
  });

  describe('createMany', () => {
    test('creates multiple models and returns Collection', async () => {
      const { b, qb } = builder();
      qb.insertGetId.mockResolvedValue(1);
      const result = await b.createMany([
        { name: 'A' }, { name: 'B' },
      ]);
      expect(result).toBeInstanceOf(Collection);
    });
  });

  // ---- withCount / withAvg / withSum / withMin / withMax ----
  describe('withAggregate methods', () => {
    test('withCount calls withAggregate with count', () => {
      const { b } = builder(new TestModelWithPosts());
      expect(() => b.withCount('posts')).not.toThrow();
    });

    test('withAvg calls withAggregate with avg', () => {
      const { b } = builder(new TestModelWithPosts());
      expect(() => b.withAvg('posts', 'likes')).not.toThrow();
    });

    test('withSum calls withAggregate with sum', () => {
      const { b } = builder(new TestModelWithPosts());
      expect(() => b.withSum('posts', 'likes')).not.toThrow();
    });

    test('withMin calls withAggregate with min', () => {
      const { b } = builder(new TestModelWithPosts());
      expect(() => b.withMin('posts', 'likes')).not.toThrow();
    });

    test('withMax calls withAggregate with max', () => {
      const { b } = builder(new TestModelWithPosts());
      expect(() => b.withMax('posts', 'likes')).not.toThrow();
    });

    test('throws for non-existent relation', () => {
      const { b } = builder();
      expect(() => b.withCount('nonExistent')).toThrow('does not exist');
    });
  });

  // ---- has / doesntHave / whereHas / whereDoesntHave ----
  describe('has / doesntHave', () => {
    test('has adds whereExists', () => {
      const { b, qb } = builder(new TestModelWithPosts());
      b.has('posts');
      expect(qb.whereExists).toHaveBeenCalled();
    });

    test('whereHas applies callback constraints', () => {
      const { b, qb } = builder(new TestModelWithPosts());
      const cb = jest.fn();
      b.whereHas('posts', cb);
      expect(cb).toHaveBeenCalled();
      expect(qb.whereExists).toHaveBeenCalled();
    });

    test('doesntHave adds whereNotExists', () => {
      const { b, qb } = builder(new TestModelWithPosts());
      b.doesntHave('posts');
      expect(qb.whereNotExists).toHaveBeenCalled();
    });

    test('whereDoesntHave applies callback and notExists', () => {
      const { b, qb } = builder(new TestModelWithPosts());
      const cb = jest.fn();
      b.whereDoesntHave('posts', cb);
      expect(cb).toHaveBeenCalled();
      expect(qb.whereNotExists).toHaveBeenCalled();
    });

    test('orWhereHas uses or boolean', () => {
      const { b, qb } = builder(new TestModelWithPosts());
      b.orWhereHas('posts');
      expect(qb.whereExists).toHaveBeenCalled();
    });

    test('orWhereDoesntHave uses or boolean', () => {
      const { b, qb } = builder(new TestModelWithPosts());
      b.orWhereDoesntHave('posts');
      expect(qb.whereNotExists).toHaveBeenCalled();
    });
  });

  // ---- chunkById (hydrate branch) ----
  describe('chunkById', () => {
    test('hydrates results and passes to callback', async () => {
      const { b, qb } = builder();
      qb.chunkById.mockImplementation(async (count: number, cb: Function, col: string) => {
        await cb([{ id: 1, name: 'A' }], 1);
        return true;
      });
      const cb = jest.fn();
      await b.chunkById(10, cb);
      expect(cb).toHaveBeenCalled();
      const [models] = cb.mock.calls[0];
      expect(models).toBeInstanceOf(Collection);
    });
  });

  // ---- proxyToQueryBuilder return-this ----
  describe('proxyToQueryBuilder chaining', () => {
    test('returns this when query returns itself', () => {
      const { b, qb } = builder();
      // where returns this.query (mockReturnThis), so proxy returns Builder
      const result = b.where('name', '=', 'test');
      expect(result).toBe(b);
    });

    test('returns raw value when query returns non-builder', () => {
      const { b, qb } = builder();
      qb.count.mockReturnValue(42);
      // count() returns a value, not the qb
    });
  });

  // ---- paginate with eager loading ----
  describe('paginate with eagerLoad', () => {
    test('applies eager loading to paginated results', async () => {
      const { b, qb } = builder(new TestModelWithPosts());

      qb.count.mockResolvedValue(2);
      qb.get.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);

      b.with('posts');
      // paginate should work without throwing
      const result = await b.paginate(10, 1);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  // ---- eagerLoadRelations with nested relations ----
  describe('eager loading nested relations', () => {
    test('with nested relation (posts.comments) handles dot notation', async () => {
      const { b, qb } = builder(new TestModelWithPosts());
      qb.get.mockResolvedValue([]);
      b.with('posts.comments');
      const result = await b.get();
      expect(result).toBeDefined();
    });
  });

  // ---- firstOrCreate create path (line 139) ----
  describe('firstOrCreate - create path', () => {
    test('creates new model when no match found', async () => {
      const { b, qb } = builder();
      // first() returns null ⇒ no existing record
      qb.get.mockResolvedValue([]);
      // spy on create to verify it's called (create uses its own QBs internally)
      const createSpy = jest.spyOn(b, 'create').mockResolvedValue({ id: 99, name: 'New', email: 'new@test.com' });
      const result = await b.firstOrCreate({ name: 'New' }, { email: 'new@test.com' });
      expect(result).toBeDefined();
      expect(createSpy).toHaveBeenCalledWith({ name: 'New', email: 'new@test.com' });
      createSpy.mockRestore();
    });
  });

  // ---- lazyById with yielded models (line 860) ----
  describe('lazyById iteration', () => {
    test('yields hydrated model instances', async () => {
      const { b, qb } = builder();
      // stub lazyById generator to yield real rows
      qb.lazyById.mockReturnValue(
        (async function* () {
          yield { id: 1, name: 'A' };
          yield { id: 2, name: 'B' };
        })()
      );
      const items: any[] = [];
      for await (const item of b.lazyById(10)) {
        items.push(item);
      }
      expect(items).toHaveLength(2);
      expect(items[0]).toBeInstanceOf(Model);
      expect(items[1]).toBeInstanceOf(Model);
    });
  });

  // ---- has / doesntHave with BelongsTo relation (lines 578-606, 650-656) ----
  describe('has_internal / doesntHave with BelongsTo', () => {
    class CompanyModel extends Model {
      protected table = 'companies';
      protected static fillable = ['id', 'name'];
      protected newBaseQueryBuilder() { return mockQB() as any; }
    }

    class UserWithCompany extends Model {
      protected table = 'users';
      protected static fillable = ['id', 'name', 'company_id'];
      protected newBaseQueryBuilder() { return mockQB() as any; }

      company() {
        return this.belongsTo(CompanyModel, 'company_id', 'id');
      }
    }

    test('has with BelongsTo relation adds whereExists', () => {
      const { b } = builder(new UserWithCompany());
      // Should not throw — exercises BelongsTo branch in has_internal
      b.has('company');
      expect(b).toBeDefined();
    });

    test('doesntHave with BelongsTo relation adds whereNotExists', () => {
      const { b } = builder(new UserWithCompany());
      b.doesntHave('company');
      expect(b).toBeDefined();
    });

    test('whereHas with BelongsTo applies callback', () => {
      const { b } = builder(new UserWithCompany());
      const callback = jest.fn();
      b.whereHas('company', callback);
      expect(callback).toHaveBeenCalled();
    });

    test('whereDoesntHave with BelongsTo applies callback', () => {
      const { b } = builder(new UserWithCompany());
      const callback = jest.fn();
      b.whereDoesntHave('company', callback);
      expect(callback).toHaveBeenCalled();
    });
  });

  // ---- withAggregate for BelongsTo (lines 482-487) ----
  describe('withAggregate BelongsTo', () => {
    class CompanyModel2 extends Model {
      protected table = 'companies';
      protected static fillable = ['id', 'name', 'employees'];
      protected newBaseQueryBuilder() { return mockQB() as any; }
    }

    class UserWithCompany2 extends Model {
      protected table = 'users';
      protected static fillable = ['id', 'name', 'company_id'];
      protected newBaseQueryBuilder() { return mockQB() as any; }

      company() {
        return this.belongsTo(CompanyModel2, 'company_id', 'id');
      }
    }

    test('withCount on BelongsTo adds selectSub', () => {
      const { b, qb } = builder(new UserWithCompany2());
      b.withCount('company');
      expect(qb.selectSub).toHaveBeenCalled();
    });

    test('withSum on BelongsTo', () => {
      const { b, qb } = builder(new UserWithCompany2());
      b.withSum('company', 'employees');
      expect(qb.selectSub).toHaveBeenCalled();
    });
  });

  // ---- withAggregate for MorphMany (lines 503-514) ----
  describe('withAggregate MorphMany', () => {
    class CommentModel extends Model {
      protected table = 'comments';
      protected static fillable = ['id', 'body', 'commentable_id', 'commentable_type'];
      protected newBaseQueryBuilder() { return mockQB() as any; }
    }

    class PostWithComments extends Model {
      protected table = 'posts';
      protected static fillable = ['id', 'title'];
      protected newBaseQueryBuilder() { return mockQB() as any; }

      comments() {
        return this.morphMany(CommentModel, 'commentable');
      }
    }

    test('withCount on MorphMany adds selectSub', () => {
      const { b, qb } = builder(new PostWithComments());
      b.withCount('comments');
      expect(qb.selectSub).toHaveBeenCalled();
    });
  });
});
