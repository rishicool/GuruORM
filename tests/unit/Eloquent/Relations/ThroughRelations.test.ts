import { Model } from '../../../../src/Eloquent/Model';
import { HasManyThrough } from '../../../../src/Eloquent/Relations/HasManyThrough';
import { HasOneThrough } from '../../../../src/Eloquent/Relations/HasOneThrough';
import { Collection } from '../../../../src/Eloquent/Collection';
import { Builder } from '../../../../src/Eloquent/Builder';

// ---------- mock helpers ----------
function mockQueryBuilder() {
  const qb: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    columns: [],
  };
  return qb;
}

function mockEloquentBuilder(model?: Model) {
  const qb = mockQueryBuilder();
  const eb = new Builder(qb);
  if (model) eb.setModel(model);
  return { eb, qb };
}

class Country extends Model {
  protected table = 'countries';
  protected static fillable = ['id'];
  protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
}

class User extends Model {
  protected table = 'users';
  protected static fillable = ['id', 'country_id'];
  protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
}

class Post extends Model {
  protected table = 'posts';
  protected static fillable = ['id', 'user_id', 'country_id', 'title'];
  protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
}

// ---------- HasManyThrough tests ----------
describe('Eloquent / Relations / HasManyThrough', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  function createRelation(parentAttrs: Record<string, any> = { id: 1 }) {
    const parent = new Country(parentAttrs);
    (parent as any).exists = true;
    parent.syncOriginal();
    const { eb } = mockEloquentBuilder(new Post());
    const rel = new HasManyThrough(
      eb,
      parent,
      User as unknown as typeof Model,
      'country_id',  // firstKey
      'user_id',     // secondKey
      'id',          // localKey
      'id',          // secondLocalKey
    );
    return { rel, parent, eb };
  }

  test('constructor sets all keys', () => {
    const { rel } = createRelation();
    expect((rel as any).firstKey).toBe('country_id');
    expect((rel as any).secondKey).toBe('user_id');
    expect((rel as any).localKey).toBe('id');
    expect((rel as any).secondLocalKey).toBe('id');
  });

  test('addConstraints joins through table and constrains parent key', () => {
    const { rel, eb } = createRelation({ id: 42 });
    rel.addConstraints();
    const qb = eb.getQuery();
    expect(qb.join).toHaveBeenCalled();
    expect(qb.where).toHaveBeenCalled();
  });

  test('addEagerConstraints constrains with array of keys', () => {
    const { rel, eb } = createRelation();
    const m1 = new Country({ id: 1 }); (m1 as any).exists = true;
    const m2 = new Country({ id: 2 }); (m2 as any).exists = true;
    
    // Reset mocks since createRelation may have called methods
    const qb = eb.getQuery();
    (qb.whereIn as jest.Mock).mockClear();
    
    rel.addEagerConstraints([m1, m2]);
    expect(qb.whereIn).toHaveBeenCalled();
  });

  test('initRelation sets empty Collection on models', () => {
    const { rel } = createRelation();
    const m1 = new Country({ id: 1 });
    const m2 = new Country({ id: 2 });
    const result = rel.initRelation([m1, m2], 'posts');
    expect(result).toEqual([m1, m2]);
    expect(m1['relations']['posts']).toBeInstanceOf(Collection);
    expect(m2['relations']['posts']).toBeInstanceOf(Collection);
  });

  test('match matches results to parent by firstKey', () => {
    const { rel } = createRelation();
    const p1 = new Country({ id: 1 });
    const p2 = new Country({ id: 2 });

    // Use plain objects that mimic getAttribute for matching
    const r1 = { getAttribute: (k: string) => ({ id: 10, country_id: 1 } as any)[k] };
    const r2 = { getAttribute: (k: string) => ({ id: 11, country_id: 1 } as any)[k] };
    const r3 = { getAttribute: (k: string) => ({ id: 12, country_id: 2 } as any)[k] };

    // initRelation first
    rel.initRelation([p1, p2], 'posts');
    rel.match([p1, p2], [r1, r2, r3], 'posts');

    expect(p1['relations']['posts']).toBeInstanceOf(Collection);
    expect(p1['relations']['posts'].length).toBe(2);
    expect(p2['relations']['posts'].length).toBe(1);
  });

  test('getResults returns Collection', async () => {
    const parent = new Country({ id: 1 });
    (parent as any).exists = true;
    parent.syncOriginal();
    const qb = mockQueryBuilder();
    qb.get.mockResolvedValue(new Collection({ id: 10, title: 'P1' }));
    const eb = new Builder(qb);
    const related = new Post();
    eb.setModel(related);

    const rel = new HasManyThrough(eb, parent, User as any, 'country_id', 'user_id', 'id', 'id');
    const results = await rel.getResults();
    expect(results).toBeInstanceOf(Collection);
  });
});

// ---------- HasOneThrough tests ----------
describe('Eloquent / Relations / HasOneThrough', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  function createRelation(parentAttrs: Record<string, any> = { id: 1 }) {
    const parent = new Country(parentAttrs);
    (parent as any).exists = true;
    parent.syncOriginal();
    const { eb } = mockEloquentBuilder(new Post());
    const rel = new HasOneThrough(
      eb,
      parent,
      User as unknown as typeof Model,
      'country_id',
      'user_id',
      'id',
      'id',
    );
    return { rel, parent, eb };
  }

  test('constructor sets keys', () => {
    const { rel } = createRelation();
    expect((rel as any).firstKey).toBe('country_id');
    expect((rel as any).secondKey).toBe('user_id');
  });

  test('addConstraints joins and constrains', () => {
    const { rel, eb } = createRelation({ id: 7 });
    rel.addConstraints();
    const qb = eb.getQuery();
    expect(qb.join).toHaveBeenCalled();
    expect(qb.where).toHaveBeenCalled();
  });

  test('addEagerConstraints uses whereIn on keys', () => {
    const { rel, eb } = createRelation();
    const m1 = new Country({ id: 1 }); (m1 as any).exists = true;
    rel.addEagerConstraints([m1]);
    expect(eb.getQuery().whereIn).toHaveBeenCalled();
  });

  test('initRelation sets null on models', () => {
    const { rel } = createRelation();
    const m = new Country({ id: 1 });
    rel.initRelation([m], 'latestPost');
    expect(m['relations']['latestPost']).toBeNull();
  });

  test('match matches single result to parent', () => {
    const { rel } = createRelation();
    const p1 = new Country({ id: 1 });
    const p2 = new Country({ id: 2 });
    rel.initRelation([p1, p2], 'latestPost');

    const r1 = { getAttribute: (k: string) => ({ id: 10, country_id: 1 } as any)[k] };
    rel.match([p1, p2], [r1], 'latestPost');

    expect(p1['relations']['latestPost']).toBe(r1);
    expect(p2['relations']['latestPost']).toBeNull();
  });

  test('getResults returns null when no result', async () => {
    const parent = new Country({ id: 1 });
    (parent as any).exists = true;
    parent.syncOriginal();
    const qb = mockQueryBuilder();
    // first() on EloquentBuilder calls take(1).get(), and get -> hydrate.
    // With empty results, first returns null
    qb.get.mockResolvedValue([]);
    const eb = new Builder(qb);
    eb.setModel(new Post());

    const rel = new HasOneThrough(eb, parent, User as any, 'country_id', 'user_id', 'id', 'id');
    const result = await rel.getResults();
    expect(result).toBeNull();
  });
});
