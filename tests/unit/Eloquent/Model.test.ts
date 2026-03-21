import { Model } from '../../../src/Eloquent/Model';

// Concrete test model
class TestUser extends Model {
  protected table = 'users';
  protected static fillable = ['name', 'email', 'age'];
  protected static hidden = ['password'];
  protected static visible: string[] = [];
  protected static casts = { age: 'integer', active: 'boolean' };
}

describe('Eloquent / Model', () => {
  beforeEach(() => {
    // Reset booted state
    (Model as any).booted = new Map();
  });

  describe('constructor & fill', () => {
    test('creates model with attributes', () => {
      const user = new TestUser({ name: 'Alice', email: 'a@b.com' });
      expect(user.getAttribute('name')).toBe('Alice');
      expect(user.getAttribute('email')).toBe('a@b.com');
    });

    test('respects fillable guard', () => {
      const user = new TestUser({ name: 'Alice', password: 'secret' });
      expect(user.getAttribute('name')).toBe('Alice');
      expect(user.getAttribute('password')).toBeUndefined();
    });

    test('forceFill bypasses guard', () => {
      const user = new TestUser();
      user.forceFill({ name: 'Bob', password: 'secret123' });
      expect(user.getAttribute('password')).toBe('secret123');
    });
  });

  describe('getAttribute / setAttribute', () => {
    test('set and get attributes', () => {
      const user = new TestUser();
      user.setAttribute('name', 'Charlie');
      expect(user.getAttribute('name')).toBe('Charlie');
    });

    test('proxy get access', () => {
      const user = new TestUser({ name: 'Alice' });
      expect((user as any).name).toBe('Alice');
    });

    test('proxy set access', () => {
      const user = new TestUser();
      (user as any).name = 'Dave';
      expect(user.getAttribute('name')).toBe('Dave');
    });

    test('returns undefined for non-existent attribute', () => {
      const user = new TestUser();
      expect(user.getAttribute('nonexistent')).toBeUndefined();
    });

    test('getAttribute with empty key returns undefined', () => {
      const user = new TestUser();
      expect(user.getAttribute('')).toBeUndefined();
    });
  });

  describe('accessor / mutator', () => {
    class WithAccessor extends Model {
      protected table = 'test';
      getFullNameAttribute() {
        return `${this.getAttribute('first_name')} ${this.getAttribute('last_name')}`;
      }
      setNameAttribute(value: string) {
        this.attributes['name'] = value.toUpperCase();
      }
    }

    test('accessor works', () => {
      const m = new WithAccessor();
      m.forceFill({ first_name: 'John', last_name: 'Doe' });
      expect(m.getAttribute('full_name')).toBe('John Doe');
    });

    test('mutator works', () => {
      const m = new WithAccessor();
      m.setAttribute('name', 'hello');
      expect(m.getAttribute('name')).toBe('HELLO');
    });
  });

  describe('casting', () => {
    test('casts integer', () => {
      const user = new TestUser();
      user.setAttribute('age', '25');
      expect(user.getAttribute('age')).toBe(25);
    });

    test('casts boolean', () => {
      const user = new TestUser();
      user.setAttribute('active', 1);
      expect(user.getAttribute('active')).toBe(true);
    });
  });

  describe('dirty tracking', () => {
    test('new model is not dirty initially', () => {
      const user = new TestUser();
      expect(user.isDirty()).toBe(false);
    });

    test('becomes dirty after setAttribute', () => {
      const user = new TestUser();
      user.setAttribute('name', 'test');
      expect(user.isDirty()).toBe(true);
      expect(user.isDirty('name')).toBe(true);
    });

    test('isClean is inverse of isDirty', () => {
      const user = new TestUser();
      expect(user.isClean()).toBe(true);
      user.setAttribute('name', 'test');
      expect(user.isClean()).toBe(false);
    });

    test('getDirty returns changed attributes', () => {
      const user = new TestUser();
      user.setAttribute('name', 'test');
      user.setAttribute('email', 'x@y.com');
      const dirty = user.getDirty();
      expect(dirty).toHaveProperty('name', 'test');
      expect(dirty).toHaveProperty('email', 'x@y.com');
    });

    test('syncOriginal clears dirty state', () => {
      const user = new TestUser();
      user.setAttribute('name', 'test');
      user.syncOriginal();
      expect(user.isDirty()).toBe(false);
    });

    test('getOriginal returns original values', () => {
      const user = new TestUser();
      user.forceFill({ name: 'original' });
      user.syncOriginal();
      user.setAttribute('name', 'changed');
      expect(user.getOriginal('name')).toBe('original');
    });

    test('getOriginal without key returns all', () => {
      const user = new TestUser();
      user.forceFill({ name: 'test' });
      user.syncOriginal();
      const orig = user.getOriginal();
      expect(orig).toHaveProperty('name', 'test');
    });
  });

  describe('serialization', () => {
    test('toArray returns attributes', () => {
      const user = new TestUser({ name: 'Alice', email: 'a@b.com' });
      const arr = user.toArray();
      expect(arr.name).toBe('Alice');
      expect(arr.email).toBe('a@b.com');
    });

    test('toArray hides hidden attributes', () => {
      const user = new TestUser();
      user.forceFill({ name: 'Alice', password: 'secret' });
      const arr = user.toArray();
      expect(arr).not.toHaveProperty('password');
    });

    test('toJSON matches toArray', () => {
      const user = new TestUser({ name: 'Alice' });
      expect(user.toJSON()).toEqual(user.toArray());
    });

    test('makeVisible overrides hidden', () => {
      const user = new TestUser();
      user.forceFill({ name: 'Alice', password: 'secret' });
      user.makeVisible('password');
      const arr = user.toArray();
      expect(arr).toHaveProperty('password', 'secret');
    });

    test('makeHidden adds to hidden', () => {
      class VisibleUser extends Model {
        protected table = 'users';
        protected static fillable = ['name', 'email'];
      }
      const user = new VisibleUser({ name: 'Alice', email: 'a@b.com' });
      user.makeHidden('email');
      const arr = user.toArray();
      expect(arr).not.toHaveProperty('email');
    });
  });

  describe('only / except', () => {
    test('only returns subset', () => {
      const user = new TestUser({ name: 'Alice', email: 'a@b.com', age: '30' });
      const result = user.only('name', 'email');
      expect(Object.keys(result)).toEqual(['name', 'email']);
    });

    test('except excludes specified', () => {
      const user = new TestUser({ name: 'Alice', email: 'a@b.com', age: '30' });
      const result = user.except('age');
      expect(result).not.toHaveProperty('age');
      expect(result).toHaveProperty('name');
    });
  });

  describe('model state', () => {
    test('modelExists returns exists flag', () => {
      const user = new TestUser();
      expect(user.modelExists()).toBe(false);
    });

    test('getKey returns primary key value', () => {
      const user = new TestUser();
      user.forceFill({ id: 42 });
      expect(user.getKey()).toBe(42);
    });

    test('getKeyName returns "id" by default', () => {
      const user = new TestUser();
      expect(user.getKeyName()).toBe('id');
    });

    test('getTable returns table name', () => {
      const user = new TestUser();
      expect(user.getTable()).toBe('users');
    });
  });

  describe('isFillable', () => {
    test('returns true for fillable attributes', () => {
      const user = new TestUser();
      expect(user.isFillable('name')).toBe(true);
    });

    test('returns false for non-fillable attributes', () => {
      const user = new TestUser();
      expect(user.isFillable('password')).toBe(false);
    });

    class UnguardedModel extends Model {
      protected table = 'test';
      protected guarded: string[] = [];
    }

    test('unguarded model allows all', () => {
      const m = new UnguardedModel();
      expect(m.isFillable('anything')).toBe(true);
    });

    class GuardedOnlyModel extends Model {
      protected table = 'test';
      protected guarded = ['secret'];
    }

    test('specific guard blocks only listed fields', () => {
      const m = new GuardedOnlyModel();
      expect(m.isFillable('secret')).toBe(false);
      expect(m.isFillable('name')).toBe(true);
    });
  });

  describe('is / isNot', () => {
    test('is() compares model identity', () => {
      const a = new TestUser();
      a.forceFill({ id: 1 });
      (a as any).exists = true;

      const b = new TestUser();
      b.forceFill({ id: 1 });
      (b as any).exists = true;

      expect(a.is(b)).toBe(true);
    });

    test('isNot() returns inverse', () => {
      const a = new TestUser();
      a.forceFill({ id: 1 });

      const b = new TestUser();
      b.forceFill({ id: 2 });

      expect(a.isNot(b)).toBe(true);
    });
  });

  describe('replicate', () => {
    test('creates copy without key', () => {
      const user = new TestUser();
      user.forceFill({ id: 1, name: 'Alice', email: 'a@b.com' });
      (user as any).exists = true;

      const clone = user.replicate();
      expect(clone.getAttribute('name')).toBe('Alice');
      expect(clone.getAttribute('id')).toBeUndefined();
      expect(clone.modelExists()).toBe(false);
    });

    test('replicate excludes specified attributes', () => {
      const user = new TestUser();
      user.forceFill({ id: 1, name: 'Alice', email: 'a@b.com' });
      (user as any).exists = true;

      const clone = user.replicate(['email']);
      expect(clone.getAttribute('email')).toBeUndefined();
    });
  });

  describe('global scopes', () => {
    class ScopedModel extends Model {
      protected table = 'scoped';
    }

    afterEach(() => {
      (Model as any).globalScopes = new Map();
    });

    test('addGlobalScope with name and implementation', () => {
      const scopeFn = { apply: jest.fn() };
      ScopedModel.addGlobalScope('active', scopeFn);
      expect(ScopedModel.hasGlobalScope('active')).toBe(true);
    });

    test('getGlobalScopes returns registered scopes', () => {
      const scopeFn = { apply: jest.fn() };
      ScopedModel.addGlobalScope('active', scopeFn);
      expect(ScopedModel.getGlobalScopes().has('active')).toBe(true);
    });

    test('hasGlobalScope returns false for missing', () => {
      expect(ScopedModel.hasGlobalScope('nonexistent')).toBe(false);
    });
  });

  describe('morph map', () => {
    class Post extends Model {
      protected table = 'posts';
    }

    afterEach(() => {
      // Clean up
      delete (Model as any).morphMap['post'];
    });

    test('setMorphMap registers aliases', () => {
      Model.setMorphMap({ post: Post });
      expect(Model.getMorphedModel('post')).toBe(Post);
    });

    test('getMorphClass returns custom alias', () => {
      Model.setMorphMap({ post: Post });
      expect(Post.getMorphClass()).toBe('post');
    });
  });

  describe('newInstance', () => {
    test('creates new instance of same class', () => {
      const user = new TestUser();
      const fresh = user.newInstance();
      expect(fresh).toBeInstanceOf(TestUser);
      expect(fresh).not.toBe(user);
    });
  });
});
