import { Model } from '../../../../src/Eloquent/Model';
import { HasMany } from '../../../../src/Eloquent/Relations/HasMany';
import { HasOne } from '../../../../src/Eloquent/Relations/HasOne';
import { Collection } from '../../../../src/Eloquent/Collection';
import { Builder } from '../../../../src/Eloquent/Builder';

// ---- helpers ----
function mockQB() {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue(true),
    insertGetId: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(1),
    columns: [],
  } as any;
}

function mockEloquentBuilder(model: Model) {
  const qb = mockQB();
  const eb = new Builder(qb);
  eb.setModel(model);
  return { eb, qb };
}

class ParentModel extends Model {
  protected table = 'parents';
  protected primaryKey = 'id';
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

class ChildModel extends Model {
  protected table = 'children';
  protected primaryKey = 'id';
  protected static fillable = ['name', 'parent_id', 'title', 'body'];
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

// ---- HasMany expanded tests ----
describe('Eloquent / Relations / HasMany — expanded', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  function createRelation(parentAttrs: Record<string, any> = { id: 1 }) {
    const parent = new ParentModel(parentAttrs);
    (parent as any).exists = true;
    parent.syncOriginal();
    const { eb } = mockEloquentBuilder(new ChildModel());
    return new HasMany(eb, parent, 'parent_id', 'id');
  }

  test('create sets foreign key on record', async () => {
    const rel = createRelation({ id: 5 });
    const createSpy = jest.spyOn(rel.getQuery(), 'create').mockResolvedValue(new ChildModel({ id: 1, parent_id: 5 }));
    await rel.create({ name: 'Child' });
    expect(createSpy).toHaveBeenCalled();
  });

  test('createMany creates multiple children', async () => {
    const rel = createRelation({ id: 3 });
    jest.spyOn(rel.getQuery(), 'create').mockResolvedValue(new ChildModel({ id: 1 }));
    const result = await rel.createMany([{ name: 'A' }, { name: 'B' }]);
    expect(result).toBeInstanceOf(Collection);
    expect(result.length).toBe(2);
  });

  test('save calls save on model', async () => {
    const rel = createRelation({ id: 7 });
    const child = new ChildModel({ id: 1, name: 'X' });
    (child as any).exists = true;
    child.syncOriginal();
    jest.spyOn(child, 'save').mockResolvedValue(true);
    const result = await rel.save(child);
    expect(child.save).toHaveBeenCalled();
  });

  test('saveMany saves multiple models', async () => {
    const rel = createRelation({ id: 7 });
    const c1 = new ChildModel({ id: 1 });
    const c2 = new ChildModel({ id: 2 });
    jest.spyOn(c1, 'save').mockResolvedValue(true);
    jest.spyOn(c2, 'save').mockResolvedValue(true);
    const result = await rel.saveMany([c1, c2]);
    expect(result).toHaveLength(2);
  });

  test('firstOrNew returns in-memory instance', () => {
    const rel = createRelation({ id: 10 });
    const result = rel.firstOrNew({ name: 'New' }, { body: 'test' });
    expect(result.getAttribute('name')).toBe('New');
    expect(result.getAttribute('body')).toBe('test');
  });

  test('getResults returns collection from query', async () => {
    const parent = new ParentModel({ id: 1 });
    (parent as any).exists = true;
    parent.syncOriginal();
    const qb = mockQB();
    qb.get.mockResolvedValue(new Collection({ id: 1, parent_id: 1 }));
    const eb = new Builder(qb);
    eb.setModel(new ChildModel());
    const rel = new HasMany(eb, parent, 'parent_id', 'id');
    const results = await rel.getResults();
    expect(results).toBeInstanceOf(Collection);
  });
});

// ---- HasOne expanded tests ----
describe('Eloquent / Relations / HasOne — expanded', () => {
  beforeEach(() => { (Model as any).booted = new Map(); });

  function createRelation(parentAttrs: Record<string, any> = { id: 1 }) {
    const parent = new ParentModel(parentAttrs);
    (parent as any).exists = true;
    parent.syncOriginal();
    const { eb } = mockEloquentBuilder(new ChildModel());
    return new HasOne(eb, parent, 'parent_id', 'id');
  }

  test('create calls save on new instance', async () => {
    const rel = createRelation({ id: 3 });
    const child = new ChildModel();
    jest.spyOn(child, 'save').mockResolvedValue(true);
    jest.spyOn(rel.getRelated(), 'newInstance').mockReturnValue(child);
    await rel.create({ title: 'Test' });
    expect(child.save).toHaveBeenCalled();
  });

  test('save calls save on model', async () => {
    const rel = createRelation({ id: 5 });
    const child = new ChildModel({ id: 1 });
    jest.spyOn(child, 'save').mockResolvedValue(true);
    await rel.save(child);
    expect(child.save).toHaveBeenCalled();
  });

  test('withDefault with boolean returns parent instance', () => {
    const rel = createRelation({ id: 1 });
    rel.withDefault(true);
    expect((rel as any).withDefaultValue).toBe(true);
  });

  test('withDefault with callback sets callback', () => {
    const rel = createRelation({ id: 1 });
    const cb = jest.fn();
    rel.withDefault(cb);
    expect((rel as any).withDefaultCallback).toBe(cb);
  });

  test('withDefault with object sets value', () => {
    const rel = createRelation({ id: 1 });
    rel.withDefault({ name: 'Guest' });
    expect((rel as any).withDefaultValue).toEqual({ name: 'Guest' });
  });

  test('getResults returns default when no result', async () => {
    const parent = new ParentModel({ id: 1 });
    (parent as any).exists = true;
    parent.syncOriginal();
    const qb = mockQB();
    qb.get.mockResolvedValue([]); // first() will return null
    const eb = new Builder(qb);
    eb.setModel(new ChildModel());
    const rel = new HasOne(eb, parent, 'parent_id', 'id');
    rel.withDefault({ name: 'Default' });
    const result = await rel.getResults();
    expect(result).toBeDefined();
  });

  test('getDefaultFor with callback', () => {
    const rel = createRelation({ id: 1 });
    const instance = new ChildModel({ id: 99 });
    rel.withDefault((m: any) => m);
    const result = (rel as any).getDefaultFor(instance);
    expect(result).toBe(instance);
  });

  test('getDefaultFor with true returns instance', () => {
    const rel = createRelation({ id: 1 });
    const instance = new ChildModel({ id: 99 });
    rel.withDefault(true);
    const result = (rel as any).getDefaultFor(instance);
    expect(result).toBe(instance);
  });

  test('getDefaultFor with Model instance returns that model', () => {
    const rel = createRelation({ id: 1 });
    const defaultModel = new ChildModel({ id: 50, name: 'Default' });
    (rel as any).withDefaultValue = defaultModel;
    const result = (rel as any).getDefaultFor(new ChildModel());
    expect(result).toBe(defaultModel);
  });

  test('match sets default for unmatched models when withDefault set', () => {
    const parent = new ParentModel({ id: 1 });
    (parent as any).exists = true;
    parent.syncOriginal();
    const { eb } = mockEloquentBuilder(new ChildModel());
    const rel = new HasOne(eb, parent, 'parent_id', 'id');
    rel.withDefault({ name: 'Fallback' });

    const p1 = new ParentModel({ id: 1 });
    const p2 = new ParentModel({ id: 2 });
    rel.initRelation([p1, p2], 'child');

    const r1 = new ChildModel({ id: 10, parent_id: 1 });
    const results = new Collection(r1);
    rel.match([p1, p2], results, 'child');

    // p1 gets matched result, p2 gets default
    expect(p1['relations']['child']).toBeDefined();
    expect(p2['relations']['child']).toBeDefined();
    expect(p2['relations']['child'].getAttribute('name')).toBe('Fallback');
  });
});
