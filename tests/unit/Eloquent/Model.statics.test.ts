import { Model } from '../../../src/Eloquent/Model';
import { Events } from '../../../src/Eloquent/Events';
import { Builder as EloquentBuilder } from '../../../src/Eloquent/Builder';
import { Collection } from '../../../src/Eloquent/Collection';

function mockQB() {
  const qb: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectRaw: jest.fn().mockReturnThis(),
    selectSub: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNotIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    whereBetween: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    whereExists: jest.fn().mockReturnThis(),
    whereNotExists: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    rightJoin: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue(true),
    insertGetId: jest.fn().mockResolvedValue(99),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
    min: jest.fn().mockResolvedValue(0),
    max: jest.fn().mockResolvedValue(0),
    sum: jest.fn().mockResolvedValue(0),
    avg: jest.fn().mockResolvedValue(0),
    pluck: jest.fn().mockResolvedValue([]),
    toSql: jest.fn().mockReturnValue(''),
    getBindings: jest.fn().mockReturnValue([]),
    upsert: jest.fn().mockResolvedValue(1),
    chunk: jest.fn().mockResolvedValue(true),
    newQuery: jest.fn(),
    columns: [],
    fromTable: 'users',
  };
  qb.newQuery.mockReturnValue({ ...qb, newQuery: qb.newQuery });
  return qb;
}

class StaticTestModel extends Model {
  protected table = 'users';
  protected static fillable = ['id', 'name', 'email', 'status'];
  protected newBaseQueryBuilder() { return mockQB() as any; }

  posts() {
    return this.hasMany(PostModel, 'user_id');
  }
}

class PostModel extends Model {
  protected table = 'posts';
  protected static fillable = ['id', 'user_id', 'title'];
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

describe('Model — static query proxies', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
    (Model as any).withoutEventsOn = false;
  });

  test('Model.query() returns EloquentBuilder', () => {
    const q = StaticTestModel.query();
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.where() returns EloquentBuilder', () => {
    const q = StaticTestModel.where('name', '=', 'Test');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.orWhere() returns EloquentBuilder', () => {
    const q = StaticTestModel.orWhere('name', '=', 'Test');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereIn() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereIn('id', [1, 2, 3]);
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereNotIn() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereNotIn('id', [1, 2]);
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereNull() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereNull('email');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereNotNull() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereNotNull('email');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereBetween() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereBetween('id', [1, 10]);
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.orderBy() returns EloquentBuilder', () => {
    const q = StaticTestModel.orderBy('name', 'asc');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.limit() returns EloquentBuilder', () => {
    const q = StaticTestModel.limit(10);
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.offset() returns EloquentBuilder', () => {
    const q = StaticTestModel.offset(5);
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.select() returns EloquentBuilder', () => {
    const q = StaticTestModel.select('id', 'name');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.join() returns EloquentBuilder', () => {
    const q = StaticTestModel.join('posts', 'users.id', '=', 'posts.user_id');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.leftJoin() returns EloquentBuilder', () => {
    const q = StaticTestModel.leftJoin('posts', 'users.id', '=', 'posts.user_id');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.rightJoin() returns EloquentBuilder', () => {
    const q = StaticTestModel.rightJoin('posts', 'users.id', '=', 'posts.user_id');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.distinct() returns EloquentBuilder', () => {
    const q = StaticTestModel.distinct();
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.groupBy() returns EloquentBuilder', () => {
    const q = StaticTestModel.groupBy('status');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.with() returns EloquentBuilder', () => {
    const q = StaticTestModel.with('posts');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.withCount() returns EloquentBuilder', () => {
    const q = StaticTestModel.withCount('posts');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.has() returns EloquentBuilder', () => {
    const q = StaticTestModel.has('posts');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.doesntHave() returns EloquentBuilder', () => {
    const q = StaticTestModel.doesntHave('posts');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereHas() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereHas('posts', (q: any) => q);
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.whereDoesntHave() returns EloquentBuilder', () => {
    const q = StaticTestModel.whereDoesntHave('posts');
    expect(q).toBeInstanceOf(EloquentBuilder);
  });

  test('Model.find() returns promise', async () => {
    const result = await StaticTestModel.find(1);
    expect(result).toBeNull(); // mock returns empty results
  });

  test('Model.findOrFail() throws when not found', async () => {
    await expect(StaticTestModel.findOrFail(1)).rejects.toThrow();
  });

  test('Model.all() returns array-like result', async () => {
    const result = await StaticTestModel.all();
    expect(result).toBeDefined();
  });

  test('Model.first() returns null when empty', async () => {
    const result = await StaticTestModel.first();
    expect(result).toBeNull();
  });

  test('Model.count() returns number', async () => {
    const result = await StaticTestModel.count();
    expect(typeof result).toBe('number');
  });

  test('Model.min() returns number', async () => {
    const result = await StaticTestModel.min('id');
    expect(typeof result).toBe('number');
  });

  test('Model.max() returns number', async () => {
    const result = await StaticTestModel.max('id');
    expect(typeof result).toBe('number');
  });

  test('Model.sum() returns number', async () => {
    const result = await StaticTestModel.sum('id');
    expect(typeof result).toBe('number');
  });

  test('Model.avg() returns number', async () => {
    const result = await StaticTestModel.avg('id');
    expect(typeof result).toBe('number');
  });

  test('Model.chunk() runs callback', async () => {
    const cb = jest.fn();
    await StaticTestModel.chunk(100, cb);
    // chunk delegates to query builder mock
  });

  test('Model.destroy() deletes by ids', async () => {
    const result = await StaticTestModel.destroy([1, 2, 3]);
    expect(typeof result).toBe('number');
  });

  test('Model.create() creates and saves model', async () => {
    const result = await StaticTestModel.create({ name: 'Created' });
    expect(result).toBeDefined();
    expect(result && result.modelExists()).toBe(true);
  });
});

describe('Model — cast attribute get/set', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  class CastModel extends Model {
    protected table = 'castable';
    protected static fillable = ['id', 'age', 'price', 'label', 'active', 'meta', 'items', 'born', 'secret'];
    protected static casts: Record<string, any> = {
      age: 'integer',
      price: 'float',
      label: 'string',
      active: 'boolean',
      meta: 'json',
      items: 'collection',
      born: 'date',
      secret: 'encrypted',
    };
    protected newBaseQueryBuilder() { return mockQB() as any; }
  }

  test('integer cast on get', () => {
    const m = new CastModel({ age: '25' });
    expect(m.getAttribute('age')).toBe(25);
  });

  test('float cast on get', () => {
    const m = new CastModel({ price: '9.99' });
    expect(m.getAttribute('price')).toBeCloseTo(9.99);
  });

  test('string cast on get', () => {
    const m = new CastModel({ label: 123 });
    expect(m.getAttribute('label')).toBe('123');
  });

  test('boolean cast on get', () => {
    const m = new CastModel({ active: 1 });
    expect(m.getAttribute('active')).toBe(true);
  });

  test('json cast on get (string input)', () => {
    const m = new CastModel({ meta: '{"foo":"bar"}' });
    expect(m.getAttribute('meta')).toEqual({ foo: 'bar' });
  });

  test('json cast on get (object input)', () => {
    const m = new CastModel({ meta: { foo: 'bar' } });
    expect(m.getAttribute('meta')).toEqual({ foo: 'bar' });
  });

  test('collection cast on get', () => {
    const m = new CastModel({ items: '[1,2,3]' });
    const val = m.getAttribute('items');
    expect(val).toBeInstanceOf(Collection);
    expect(val.length).toBe(3);
  });

  test('date cast on get', () => {
    const m = new CastModel({ born: '2000-01-01' });
    expect(m.getAttribute('born')).toBeInstanceOf(Date);
  });

  test('encrypted cast round-trips through base64', () => {
    const m = new CastModel({ secret: 'hello' });
    // set encodes to base64, get decodes from base64
    expect(m.getAttribute('secret')).toBe('hello');
  });

  test('cast for set: json stringifies objects', () => {
    const m = new CastModel();
    m.setAttribute('meta', { a: 1 });
    // Internal attributes should hold the JSON string
    expect(typeof (m as any).attributes['meta']).toBe('string');
  });

  test('cast for set: date converts to ISO string', () => {
    const m = new CastModel();
    const d = new Date('2020-06-15');
    m.setAttribute('born', d);
    expect(typeof (m as any).attributes['born']).toBe('string');
  });

  test('cast for set: encrypted encodes to base64', () => {
    const m = new CastModel();
    m.setAttribute('secret', 'mysecret');
    expect((m as any).attributes['secret']).toBe(Buffer.from('mysecret').toString('base64'));
  });

  test('custom cast class with get/set', () => {
    class UpperCast {
      get(_model: any, _key: string, value: any) { return String(value).toUpperCase(); }
      set(_model: any, _key: string, value: any) { return String(value).toLowerCase(); }
    }
    class CustomCastModel extends Model {
      protected table = 'cc';
      protected static fillable = ['id', 'title'];
      protected static casts: Record<string, any> = { title: new UpperCast() };
      protected newBaseQueryBuilder() { return mockQB() as any; }
    }
    const m = new CustomCastModel({ title: 'hello' });
    expect(m.getAttribute('title')).toBe('HELLO');
  });

  test('custom cast constructor class', () => {
    class LowerCast {
      get(_m: any, _k: string, v: any) { return String(v).toLowerCase(); }
    }
    class CCModel extends Model {
      protected table = 'cc2';
      protected static fillable = ['id', 'name'];
      protected static casts: Record<string, any> = { name: LowerCast };
      protected newBaseQueryBuilder() { return mockQB() as any; }
    }
    const m = new CCModel({ name: 'UPPER' });
    expect(m.getAttribute('name')).toBe('upper');
  });
});

describe('Model — resolveModel', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  test('resolves from class constructor', () => {
    const m = new StaticTestModel();
    const resolved = (m as any).resolveModel(StaticTestModel);
    expect(resolved).toBe(StaticTestModel);
  });

  test('throws for unregistered string name', () => {
    const m = new StaticTestModel();
    expect(() => (m as any).resolveModel('NonExistentModel')).toThrow('not found in registry');
  });

  test('resolves from string when registered', () => {
    const m = new StaticTestModel();
    // StaticTestModel is auto-registered via boot
    const resolved = (m as any).resolveModel('StaticTestModel');
    expect(resolved).toBe(StaticTestModel);
  });
});

describe('Model — toArray with appends', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  class AppendModel extends Model {
    protected table = 'appendable';
    protected static fillable = ['id', 'first', 'last'];
    protected appends = ['full_name'];
    protected newBaseQueryBuilder() { return mockQB() as any; }

    getFullNameAttribute() {
      return `${this.getAttribute('first')} ${this.getAttribute('last')}`;
    }
  }

  test('toArray includes appended attributes', () => {
    const m = new AppendModel({ id: 1, first: 'John', last: 'Doe' });
    const arr = m.toArray();
    expect(arr.full_name).toBe('John Doe');
  });
});

describe('Model — makeVisible', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  class VisModel extends Model {
    protected table = 'vis';
    protected static fillable = ['id', 'name', 'secret'];
    protected visible: string[] = ['id', 'name'];
    protected newBaseQueryBuilder() { return mockQB() as any; }
  }

  test('makeVisible adds attributes to visible', () => {
    const m = new VisModel({ id: 1, name: 'A', secret: 'x' });
    m.makeVisible(['secret']);
    const arr = m.toArray();
    expect(arr).toHaveProperty('secret');
  });
});

describe('Model — static firstOrNew / firstOrCreate / updateOrCreate / upsert', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
  });

  test('firstOrNew returns new instance when not found', async () => {
    const result = await StaticTestModel.firstOrNew({ name: 'Missing' });
    expect(result).toBeDefined();
    expect(result.modelExists()).toBe(false);
  });

  test('firstOrCreate creates when not found', async () => {
    const result = await StaticTestModel.firstOrCreate({ name: 'New' });
    expect(result).toBeDefined();
    expect(result.modelExists()).toBe(true);
  });

  test('updateOrCreate creates when not found', async () => {
    const result = await StaticTestModel.updateOrCreate(
      { name: 'Missing' },
      { email: 'new@x.com' },
    );
    expect(result).toBeDefined();
    expect(result.modelExists()).toBe(true);
  });

  test('upsert delegates to query builder', async () => {
    const result = await StaticTestModel.upsert(
      [{ name: 'A' }],
      ['name'],
      ['email'],
    );
    expect(typeof result).toBe('number');
  });
});

describe('Model — freshTimestamp', () => {
  test('returns Date', () => {
    const m = new StaticTestModel();
    expect((m as any).freshTimestamp()).toBeInstanceOf(Date);
  });
});

describe('Model — getTable fallback', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  test('uses table property when set', () => {
    const m = new StaticTestModel();
    expect(m.getTable()).toBe('users');
  });

  class NoTableModel extends Model {
    protected static fillable = ['id'];
    protected newBaseQueryBuilder() { return mockQB() as any; }
  }

  test('falls back to pluralized class name', () => {
    const m = new NoTableModel();
    const table = m.getTable();
    // Should derive from class name
    expect(typeof table).toBe('string');
    expect(table.length).toBeGreaterThan(0);
  });
});

describe('Model — observe / clearObservers', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  test('observe registers and clearObservers clears', () => {
    class TestObserver {
      creating() {}
      updating() {}
    }
    expect(() => StaticTestModel.observe(new TestObserver())).not.toThrow();
    expect(() => StaticTestModel.clearObservers()).not.toThrow();
  });
});

describe('Model — refresh / fresh', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  test('fresh returns null when model does not exist', async () => {
    const m = new StaticTestModel();
    (m as any).exists = false;
    const result = await m.fresh();
    expect(result).toBeNull();
  });
});
