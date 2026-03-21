import { Factory, FactoryManager, factory, defineFactory } from '../../../src/Seeding/Factory';
import { Model } from '../../../src/Eloquent/Model';

function mockQB() {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue(true),
    insertGetId: jest.fn().mockResolvedValue(99),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    columns: [],
  };
}

class TestUser extends Model {
  protected table = 'users';
  protected static fillable = ['id', 'name', 'email', 'post_id'];
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

class TestPost extends Model {
  protected table = 'posts';
  protected static fillable = ['id', 'title', 'user_id'];
  protected newBaseQueryBuilder() { return mockQB() as any; }
}

describe('Seeding / Factory', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    FactoryManager.clear();
  });

  // ---- Basic Factory ----
  test('Factory.for creates factory instance', () => {
    const f = Factory.for(TestUser);
    expect(f).toBeInstanceOf(Factory);
  });

  test('make returns single model (count=1)', async () => {
    const f = Factory.for(TestUser);
    const result = await f.make({ name: 'Test' });
    expect(result).toBeDefined();
    expect(result).not.toBeInstanceOf(Array);
  });

  test('make with times returns array', async () => {
    const f = Factory.for(TestUser).times(3);
    const result = await f.make({ name: 'Test' });
    expect(Array.isArray(result)).toBe(true);
    expect((result as any[]).length).toBe(3);
  });

  test('state merges attributes', async () => {
    const f = Factory.for(TestUser).state({ email: 'state@test.com' });
    const result = await f.make({ name: 'A' }) as any;
    expect(result.getAttribute('email')).toBe('state@test.com');
  });

  test('afterMaking callback is called', async () => {
    const cb = jest.fn();
    const f = Factory.for(TestUser).afterMaking(cb);
    await f.make({ name: 'A' });
    expect(cb).toHaveBeenCalled();
  });

  test('create saves the model', async () => {
    const f = Factory.for(TestUser);
    const result = await f.create({ name: 'Saved' }) as any;
    expect(result.modelExists()).toBe(true);
  });

  test('create with times saves multiple', async () => {
    const f = Factory.for(TestUser).times(2);
    const result = await f.create({ name: 'A' }) as any[];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].modelExists()).toBe(true);
  });

  test('afterCreating callback is called on create', async () => {
    const cb = jest.fn();
    const f = Factory.for(TestUser).afterCreating(cb);
    await f.create({ name: 'A' });
    expect(cb).toHaveBeenCalled();
  });

  // ---- Relationships ----
  test('for() registers parent relationship', async () => {
    const parent = new TestPost();
    parent.forceFill({ id: 42, title: 'Post' });
    (parent as any).exists = true;

    const f = Factory.for(TestUser).for(parent, 'post', 'post_id');
    const result = await f.create({ name: 'User' }) as any;
    expect(result.getAttribute('post_id')).toBe(42);
  });

  test('for() with factory creates parent first', async () => {
    const parentFactory = Factory.for(TestPost);
    const f = Factory.for(TestUser).for(parentFactory, 'post', 'post_id');
    const result = await f.create({ name: 'User' }) as any;
    // Parent should have been created, FK set
    expect(result.modelExists()).toBe(true);
  });

  test('has() registers child relationship', async () => {
    const childFactory = Factory.for(TestPost);
    const f = Factory.for(TestUser).has(childFactory, 'posts');
    const result = await f.create({ name: 'Author' }) as any;
    expect(result.modelExists()).toBe(true);
  });

  // ---- FactoryManager ----
  test('register and for', () => {
    class UserFactory extends Factory<TestUser> {
      protected definition() { return { name: 'Default' }; }
    }
    FactoryManager.register(TestUser, UserFactory);
    expect(FactoryManager.has(TestUser)).toBe(true);
    const f = FactoryManager.for(TestUser);
    expect(f).toBeInstanceOf(UserFactory);
  });

  test('for returns default factory when not registered', () => {
    const f = FactoryManager.for(TestPost);
    expect(f).toBeInstanceOf(Factory);
  });

  test('clear removes all factories', () => {
    FactoryManager.register(TestUser, Factory as any);
    FactoryManager.clear();
    expect(FactoryManager.has(TestUser)).toBe(false);
  });

  // ---- Helper functions ----
  test('factory() helper returns factory', () => {
    const f = factory(TestUser);
    expect(f).toBeInstanceOf(Factory);
  });

  test('factory() with count sets times', async () => {
    const f = factory(TestUser, 3);
    const result = await f.make();
    expect(Array.isArray(result)).toBe(true);
    expect((result as any[]).length).toBe(3);
  });

  test('defineFactory registers custom factory', async () => {
    defineFactory(TestUser, () => ({ name: 'Defined', email: 'def@x.com' }));
    expect(FactoryManager.has(TestUser)).toBe(true);
    const f = FactoryManager.for(TestUser);
    const result = await f.make() as any;
    expect(result.getAttribute('name')).toBe('Defined');
    expect(result.getAttribute('email')).toBe('def@x.com');
  });
});
