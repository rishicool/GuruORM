import { Model } from '../../../src/Eloquent/Model';

class User extends Model {
  protected table = 'users';
  protected static fillable = ['name', 'email', 'age', 'role'];
  protected static hidden = ['password'];
  protected static casts = { age: 'integer', active: 'boolean' };
  timestamps = true;
}

describe('Eloquent / Model (extended)', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
  });

  describe('wasChanged / getChanges', () => {
    test('wasChanged after syncOriginal', () => {
      const u = new User();
      u.forceFill({ name: 'A' });
      // syncOriginal stores current dirty into changes
      u.syncOriginal();
      expect(u.wasChanged()).toBe(true);
      expect(u.wasChanged('name')).toBe(true);
    });

    test('getChanges returns changed attributes', () => {
      const u = new User();
      u.forceFill({ name: 'B' });
      u.syncOriginal();
      const changes = u.getChanges();
      expect(changes).toHaveProperty('name', 'B');
    });

    test('wasChanged returns false when nothing changed', () => {
      const u = new User();
      u.syncOriginal(); // no dirty attributes
      expect(u.wasChanged()).toBe(false);
    });
  });

  describe('syncOriginalAttribute', () => {
    test('syncs a single attribute', () => {
      const u = new User();
      u.forceFill({ name: 'A', email: 'a@b.com' });
      u.syncOriginal();
      u.setAttribute('name', 'B');
      u.setAttribute('email', 'new@b.com');
      
      u.syncOriginalAttribute('name');
      expect(u.isDirty('name')).toBe(false);
      expect(u.isDirty('email')).toBe(true);
    });
  });

  describe('originalIsEquivalent (via isDirty)', () => {
    test('same value is not dirty', () => {
      const u = new User();
      u.forceFill({ name: 'same' });
      u.syncOriginal();
      u.setAttribute('name', 'same');
      expect(u.isDirty('name')).toBe(false);
    });

    test('null vs value is dirty', () => {
      const u = new User();
      u.forceFill({ name: null as any });
      u.syncOriginal();
      u.setAttribute('name', 'now set');
      expect(u.isDirty('name')).toBe(true);
    });

    test('equivalent objects not dirty (JSON compare)', () => {
      const u = new User();
      u.forceFill({ meta: { a: 1 } } as any);
      u.syncOriginal();
      u.setAttribute('meta', { a: 1 });
      expect(u.isDirty('meta')).toBe(false);
    });
  });

  describe('serialization extras', () => {
    test('attributesToArray returns casted values', () => {
      const u = new User();
      u.forceFill({ name: 'Alice', age: '25' });
      const arr = u.attributesToArray();
      expect(arr.age).toBe(25);
    });

    test('toArray includes relations', () => {
      const u = new User();
      u.forceFill({ name: 'Alice' });
      // Manually set a relation
      (u as any).relations = { profile: { toArray: () => ({ bio: 'test' }) } };
      const arr = u.toArray();
      expect(arr.profile).toEqual({ bio: 'test' });
    });

    test('toArray handles array relations', () => {
      const u = new User();
      u.forceFill({ name: 'Alice' });
      (u as any).relations = { posts: [{ toArray: () => ({ id: 1 }) }, { id: 2 }] };
      const arr = u.toArray();
      expect(arr.posts[0]).toEqual({ id: 1 });
      expect(arr.posts[1]).toEqual({ id: 2 });
    });

    test('toArray handles non-object relations', () => {
      const u = new User();
      u.forceFill({ name: 'Alice' });
      (u as any).relations = { count: 5 };
      const arr = u.toArray();
      expect(arr.count).toBe(5);
    });

    test('toJson is alias for toJSON', () => {
      const u = new User();
      u.forceFill({ name: 'Alice' });
      expect(u.toJson()).toEqual(u.toJSON());
    });

    test('visible restricts output', () => {
      class VisibleModel extends Model {
        protected table = 'test';
        protected visible = ['name'];
      }
      const m = new VisibleModel();
      m.forceFill({ name: 'Alice', email: 'a@b.com' });
      const arr = m.toArray();
      expect(arr).toHaveProperty('name');
      expect(arr).not.toHaveProperty('email');
    });
  });

  describe('makeVisible / makeHidden', () => {
    test('makeVisible removes from hidden and adds to visible', () => {
      const u = new User();
      u.forceFill({ name: 'Alice', password: 'secret' });
      u.makeVisible('password');
      expect(u.toArray().password).toBe('secret');
    });

    test('makeHidden adds to hidden', () => {
      class M extends Model {
        protected table = 'test';
      }
      const m = new M();
      m.forceFill({ name: 'A', email: 'a@b.com' });
      m.makeHidden(['email']);
      expect(m.toArray()).not.toHaveProperty('email');
    });
  });

  describe('connection management', () => {
    test('getConnectionName returns undefined by default', () => {
      const u = new User();
      expect(u.getConnectionName()).toBeUndefined();
    });

    test('setConnection changes connection name', () => {
      const u = new User();
      u.setConnection('mysql');
      expect(u.getConnectionName()).toBe('mysql');
    });
  });

  describe('table resolution', () => {
    test('uses table property when set', () => {
      expect(new User().getTable()).toBe('users');
    });

    test('falls back to pluralized class name', () => {
      class Post extends Model {}
      const p = new Post();
      expect(p.getTable()).toMatch(/post/i);
    });
  });

  describe('model registry & morph', () => {
    class Article extends Model {
      protected table = 'articles';
    }

    afterEach(() => {
      delete (Model as any).morphMap['article'];
      delete (Model as any).modelRegistry['CustomArticle'];
    });

    test('register adds model to registry', () => {
      Model.register('CustomArticle', Article);
      expect(Model.getModel('CustomArticle')).toBe(Article);
    });

    test('getModel returns undefined for unregistered', () => {
      expect(Model.getModel('NonExistent')).toBeUndefined();
    });
  });

  describe('global scopes on Model', () => {
    class ScopedPost extends Model {
      protected table = 'posts';
    }

    afterEach(() => {
      (Model as any).globalScopes = new Map();
    });

    test('addGlobalScope with scope object', () => {
      class ActiveScope { apply() {} }
      ScopedPost.addGlobalScope(new ActiveScope());
      expect(ScopedPost.hasGlobalScope('ActiveScope')).toBe(true);
    });

    test('addGlobalScope with named function', () => {
      ScopedPost.addGlobalScope('published', { apply: () => {} });
      expect(ScopedPost.hasGlobalScope('published')).toBe(true);
    });

    test('getGlobalScopes returns empty map when none', () => {
      class EmptyModel extends Model {}
      expect(EmptyModel.getGlobalScopes().size).toBe(0);
    });
  });

  describe('withoutTimestamps', () => {
    test('disables timestamps during callback', async () => {
      let timestampsDisabled = false;
      await Model.withoutTimestamps(() => {
        timestampsDisabled = (Model as any).isIgnoringTimestamps();
      });
      expect(timestampsDisabled).toBe(true);
      expect((Model as any).isIgnoringTimestamps()).toBe(false);
    });
  });

  describe('withoutEvents', () => {
    test('disables events during callback', async () => {
      let eventsOff = false;
      await Model.withoutEvents(() => {
        eventsOff = (Model as any).withoutEventsOn;
      });
      expect(eventsOff).toBe(true);
      expect((Model as any).withoutEventsOn).toBe(false);
    });
  });

  describe('newInstance', () => {
    test('creates new instance with attributes', () => {
      const u = new User();
      const fresh = u.newInstance({ name: 'Bob' }, false);
      expect(fresh).toBeInstanceOf(User);
      // newInstance uses forceFill so name should be set
      expect(fresh.getAttribute('name')).toBe('Bob');
      expect(fresh.modelExists()).toBe(false);
    });

    test('creates existing instance', () => {
      const u = new User();
      const existing = u.newInstance({ id: 1, name: 'Alice' }, true);
      expect(existing.modelExists()).toBe(true);
    });
  });

  describe('fresh / refresh (without DB)', () => {
    test('fresh returns null when model does not exist', async () => {
      const u = new User();
      expect(await u.fresh()).toBeNull();
    });

    test('refresh returns self when model does not exist', async () => {
      const u = new User();
      expect(await u.refresh()).toBe(u);
    });
  });

  describe('replicate', () => {
    test('removes primary key and timestamps', () => {
      const u = new User();
      u.forceFill({ id: 1, name: 'Alice', created_at: new Date(), updated_at: new Date() });
      (u as any).exists = true;
      const clone = u.replicate();
      expect(clone.getAttribute('id')).toBeUndefined();
      expect(clone.getAttribute('created_at')).toBeUndefined();
      expect(clone.getAttribute('name')).toBe('Alice');
    });
  });

  describe('delete / forceDelete (without DB)', () => {
    test('delete returns false when model does not exist', async () => {
      const u = new User();
      expect(await u.delete()).toBe(false);
    });

    test('update returns false when model does not exist', async () => {
      const u = new User();
      expect(await u.update({ name: 'new' })).toBe(false);
    });
  });

  describe('snake helper', () => {
    test('model uses snake for table name fallback', () => {
      class UserProfile extends Model {}
      const m = new UserProfile();
      expect(m.getTable()).toMatch(/user_profile/);
    });
  });

  describe('setConnectionResolver / getConnectionResolver', () => {
    afterEach(() => {
      Model.setConnectionResolver(null as any);
    });

    test('sets and gets resolver', () => {
      const resolver = { connection: jest.fn() };
      Model.setConnectionResolver(resolver);
      expect(Model.getConnectionResolver()).toBe(resolver);
    });
  });
});
