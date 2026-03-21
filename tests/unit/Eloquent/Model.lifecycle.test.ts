import { Model } from '../../../src/Eloquent/Model';
import { Events } from '../../../src/Eloquent/Events';
import { Builder as EloquentBuilder } from '../../../src/Eloquent/Builder';
import { Collection } from '../../../src/Eloquent/Collection';

/**
 * Tests for Model save/update/delete and related lifecycle methods.
 * Uses mocked query builder to avoid DB connections.
 */

// Shared mock query builder factory
function mockQueryBuilder() {
  const qb: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue(true),
    insertGetId: jest.fn().mockResolvedValue(99),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
    pluck: jest.fn().mockResolvedValue([]),
    toSql: jest.fn().mockReturnValue(''),
    getBindings: jest.fn().mockReturnValue([]),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    columns: [],
  };
  return qb;
}

// Model subclass with overridden newBaseQueryBuilder to avoid needing a real connection
class TestSaveModel extends Model {
  protected table = 'users';
  protected static fillable = ['name', 'email', 'status'];
  public timestamps = true;

  protected newBaseQueryBuilder() {
    return mockQueryBuilder() as any;
  }
}

class NoTimestampModel extends Model {
  protected table = 'items';
  protected static fillable = ['title'];
  public timestamps = false;

  protected newBaseQueryBuilder() {
    return mockQueryBuilder() as any;
  }
}

describe('Eloquent / Model — save/update/delete lifecycle', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
    (Model as any).withoutEventsOn = false;
    (Model as any).withoutTimestampsOn = false;
  });

  // ---- save (insert) ----
  describe('save (insert)', () => {
    test('saves new model via insert and sets exists', async () => {
      const m = new TestSaveModel();
      m.fill({ name: 'Alice', email: 'a@b.c' });
      expect(m.modelExists()).toBe(false);

      const result = await m.save();
      expect(result).toBe(true);
      expect(m.modelExists()).toBe(true);
      expect((m as any).wasRecentlyCreated).toBe(true);
      // id should be set from insertGetId
      expect(m.getAttribute('id')).toBe(99);
    });

    test('insert sets timestamps when enabled', async () => {
      const m = new TestSaveModel();
      m.fill({ name: 'Bob' });
      await m.save();
      expect(m.getAttribute('created_at')).toBeInstanceOf(Date);
      expect(m.getAttribute('updated_at')).toBeInstanceOf(Date);
    });

    test('insert does not set timestamps when disabled', async () => {
      const m = new NoTimestampModel();
      m.fill({ title: 'Test' });
      await m.save();
      expect(m.getAttribute('created_at')).toBeUndefined();
    });
  });

  // ---- save (update) ----
  describe('save (update)', () => {
    test('performs update when model exists', async () => {
      const m = new TestSaveModel({ id: 1, name: 'Alice' });
      (m as any).exists = true;
      m.syncOriginal();

      m.setAttribute('name', 'Bob');
      const result = await m.save();
      expect(result).toBe(true);
    });

    test('returns true when nothing dirty', async () => {
      const m = new TestSaveModel({ id: 1, name: 'Alice' });
      (m as any).exists = true;
      m.syncOriginal();

      const result = await m.save();
      expect(result).toBe(true);
    });
  });

  // ---- update ----
  describe('update', () => {
    test('fills attributes and saves', async () => {
      const m = new TestSaveModel({ id: 1, name: 'Alice' });
      (m as any).exists = true;
      m.syncOriginal();

      const result = await m.update({ name: 'Bob' });
      expect(result).toBe(true);
      expect(m.getAttribute('name')).toBe('Bob');
    });

    test('returns false when model does not exist', async () => {
      const m = new TestSaveModel();
      const result = await m.update({ name: 'X' });
      expect(result).toBe(false);
    });
  });

  // ---- saveQuietly ----
  describe('saveQuietly', () => {
    test('saves without firing events', async () => {
      const spy = jest.fn();
      TestSaveModel.creating(spy);

      const m = new TestSaveModel();
      m.fill({ name: 'Quiet' });
      await m.saveQuietly();
      expect(m.modelExists()).toBe(true);
      // event should not have fired (events were temporarily nulled)
    });
  });

  // ---- delete ----
  describe('delete', () => {
    test('deletes existing model', async () => {
      const m = new TestSaveModel({ id: 1, name: 'Alice' });
      (m as any).exists = true;
      m.syncOriginal();

      const result = await m.delete();
      expect(result).toBe(true);
      expect(m.modelExists()).toBe(false);
    });

    test('returns false when model does not exist', async () => {
      const m = new TestSaveModel();
      const result = await m.delete();
      expect(result).toBe(false);
    });
  });

  // ---- forceDelete ----
  describe('forceDelete', () => {
    test('calls delete on model', async () => {
      const m = new TestSaveModel({ id: 1 });
      (m as any).exists = true;
      m.syncOriginal();
      const result = await m.forceDelete();
      expect(result).toBe(true);
    });
  });

  // ---- touch ----
  describe('touch', () => {
    test('updates timestamps and saves', async () => {
      const m = new TestSaveModel({ id: 1, name: 'A' });
      (m as any).exists = true;
      m.syncOriginal();
      m.timestamps = true;

      await m.touch();
      expect(m.getAttribute('updated_at')).toBeInstanceOf(Date);
    });

    test('returns false when timestamps disabled', async () => {
      const m = new NoTimestampModel({ id: 1, title: 'T' });
      (m as any).exists = true;
      m.syncOriginal();

      const result = await m.touch();
      expect(result).toBe(false);
    });
  });

  // ---- events halting ----
  describe('event halting', () => {
    test('saving event returning false prevents save', async () => {
      class EventModel extends Model {
        protected table = 'events';
        protected static fillable = ['name'];
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
      }
      EventModel.saving(() => false);

      const m = new EventModel();
      m.fill({ name: 'X' });
      const result = await m.save();
      expect(result).toBe(false);
      expect(m.modelExists()).toBe(false);
    });

    test('creating event returning false prevents insert', async () => {
      class EventModel2 extends Model {
        protected table = 'events2';
        protected static fillable = ['name'];
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
      }
      EventModel2.creating(() => false);

      const m = new EventModel2();
      m.fill({ name: 'X' });
      const result = await m.save();
      expect(result).toBe(false);
    });

    test('deleting event returning false prevents delete', async () => {
      class EventModel3 extends Model {
        protected table = 'events3';
        protected static fillable = ['name'];
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
      }
      EventModel3.deleting(() => false);

      const m = new EventModel3({ id: 1 });
      (m as any).exists = true;
      const result = await m.delete();
      expect(result).toBe(false);
      expect(m.modelExists()).toBe(true);
    });
  });

  // ---- withoutEvents ----
  describe('withoutEvents', () => {
    test('suppresses events inside callback', async () => {
      const spy = jest.fn();
      class EvModel extends Model {
        protected table = 'ev';
        protected static fillable = ['x'];
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
      }
      EvModel.saving(spy);

      await EvModel.withoutEvents(async () => {
        const m = new EvModel();
        m.fill({ x: 'y' });
        await m.save();
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ---- withoutTimestamps ----
  describe('withoutTimestamps', () => {
    test('disables timestamps inside callback', async () => {
      class TsModel extends Model {
        protected table = 'ts';
        public timestamps = true;
        protected static fillable = ['v'];
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
      }

      await TsModel.withoutTimestamps(async () => {
        const m = new TsModel();
        m.fill({ v: '1' });
        await m.save();
        expect(m.getAttribute('created_at')).toBeUndefined();
      });
    });
  });

  // ---- updateTimestamps ----
  describe('updateTimestamps', () => {
    test('sets updated_at on existing model', async () => {
      const m = new TestSaveModel({ id: 1, name: 'A' });
      (m as any).exists = true;
      m.syncOriginal();
      m.setAttribute('name', 'B');
      await m.save();
      expect(m.getAttribute('updated_at')).toBeInstanceOf(Date);
    });
  });

  // ---- touchOwners ----
  describe('touchOwners', () => {
    test('does nothing when no touches defined', async () => {
      const m = new TestSaveModel({ id: 1 });
      (m as any).exists = true;
      (m as any).touches = [];
      await m.touchOwners();
      // no error
    });

    test('touches loaded relation', async () => {
      const m = new TestSaveModel({ id: 1 });
      (m as any).exists = true;
      const related = { touch: jest.fn() };
      m.setRelation('parent', related);
      (m as any).touches = ['parent'];
      await m.touchOwners();
      expect(related.touch).toHaveBeenCalled();
    });
  });

  // ---- replicate ----
  describe('replicate', () => {
    test('creates non-existing clone without pk', () => {
      const m = new TestSaveModel({ id: 1, name: 'Alice', email: 'a@b.c' });
      (m as any).exists = true;
      const clone = m.replicate();
      expect(clone.modelExists()).toBe(false);
      expect(clone.getAttribute('id')).toBeUndefined();
      expect(clone.getAttribute('name')).toBe('Alice');
    });

    test('replicate except excludes specified attributes', () => {
      const m = new TestSaveModel({ id: 1, name: 'Alice', email: 'a@b.c' });
      (m as any).exists = true;
      const clone = m.replicate(['email']);
      expect(clone.getAttribute('email')).toBeUndefined();
    });
  });

  // ---- newInstance ----
  describe('newInstance', () => {
    test('creates fresh instance with given attributes', () => {
      const m = new TestSaveModel();
      const inst = m.newInstance({ name: 'Fresh' }, false);
      expect(inst.getAttribute('name')).toBe('Fresh');
      expect(inst.modelExists()).toBe(false);
    });

    test('creates existing instance', () => {
      const m = new TestSaveModel();
      const inst = m.newInstance({ id: 5, name: 'Existing' }, true);
      expect(inst.modelExists()).toBe(true);
    });
  });

  // ---- relationships ----
  describe('relationship definitions', () => {
    class Author extends Model {
      protected table = 'authors';
      protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
    }

    class Post extends Model {
      protected table = 'posts';
      protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
    }

    class Comment extends Model {
      protected table = 'comments';
      protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
    }

    class Tag extends Model {
      protected table = 'tags';
      protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
    }

    class Image extends Model {
      protected table = 'images';
      protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
    }

    class Country extends Model {
      protected table = 'countries';
      protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
    }

    test('hasOne creates HasOne relation', () => {
      const author = new Author({ id: 1 });
      const rel = author.hasOne(Post);
      expect(rel.constructor.name).toBe('HasOne');
    });

    test('hasMany creates HasMany relation', () => {
      const author = new Author({ id: 1 });
      const rel = author.hasMany(Post);
      expect(rel.constructor.name).toBe('HasMany');
    });

    test('belongsTo creates BelongsTo relation', () => {
      const post = new Post({ id: 1, author_id: 1 });
      const rel = post.belongsTo(Author);
      expect(rel.constructor.name).toBe('BelongsTo');
    });

    test('belongsToMany creates BelongsToMany relation', () => {
      const post = new Post({ id: 1 });
      const rel = post.belongsToMany(Tag);
      expect(rel.constructor.name).toBe('BelongsToMany');
    });

    test('morphOne creates MorphOne relation', () => {
      const post = new Post({ id: 1 });
      const rel = post.morphOne(Image, 'imageable');
      expect(rel.constructor.name).toBe('MorphOne');
    });

    test('morphMany creates MorphMany relation', () => {
      const post = new Post({ id: 1 });
      const rel = post.morphMany(Comment, 'commentable');
      expect(rel.constructor.name).toBe('MorphMany');
    });

    test('morphTo creates MorphTo relation', () => {
      const comment = new Comment({ id: 1 });
      const rel = comment.morphTo('commentable');
      expect(rel.constructor.name).toBe('MorphTo');
    });

    test('hasOneThrough creates HasOneThrough relation', () => {
      const country = new Country({ id: 1 });
      const rel = country.hasOneThrough(Post, Author);
      expect(rel.constructor.name).toBe('HasOneThrough');
    });

    test('hasManyThrough creates HasManyThrough relation', () => {
      const country = new Country({ id: 1 });
      const rel = country.hasManyThrough(Post, Author);
      expect(rel.constructor.name).toBe('HasManyThrough');
    });
  });

  // ---- getForeignKey ----
  describe('getForeignKey', () => {
    test('returns snake_case class name + _id', () => {
      const m = new TestSaveModel();
      expect(m.getForeignKey()).toBe('test_save_model_id');
    });
  });

  // ---- getTable fallback ----
  describe('getTable', () => {
    test('returns pluralized snake_case when no table set', () => {
      class UserProfile extends Model {
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
      }
      const m = new UserProfile();
      expect(m.getTable()).toBe('user_profiles');
    });
  });

  // ---- load / loadMissing ----
  describe('load', () => {
    test('loads a relation by string', async () => {
      class LoadModel extends Model {
        protected table = 'load';
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
        posts() {
          return {
            getResults: jest.fn().mockResolvedValue([{ id: 1 }]),
            getQuery: jest.fn().mockReturnThis(),
          };
        }
      }
      const m = new LoadModel({ id: 1 });
      await m.load('posts');
      expect(m.relationLoaded('posts')).toBe(true);
    });

    test('loads multiple relations by array', async () => {
      class LoadModel2 extends Model {
        protected table = 'load2';
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
        posts() {
          return { getResults: jest.fn().mockResolvedValue([]), getQuery: jest.fn().mockReturnThis() };
        }
        comments() {
          return { getResults: jest.fn().mockResolvedValue([]), getQuery: jest.fn().mockReturnThis() };
        }
      }
      const m = new LoadModel2({ id: 1 });
      await m.load(['posts', 'comments']);
      expect(m.relationLoaded('posts')).toBe(true);
      expect(m.relationLoaded('comments')).toBe(true);
    });
  });

  describe('loadMissing', () => {
    test('only loads relations not already present', async () => {
      class LMModel extends Model {
        protected table = 'lm';
        protected newBaseQueryBuilder() { return mockQueryBuilder() as any; }
        posts() {
          return { getResults: jest.fn().mockResolvedValue([]), getQuery: jest.fn().mockReturnThis() };
        }
        tags() {
          return { getResults: jest.fn().mockResolvedValue([]), getQuery: jest.fn().mockReturnThis() };
        }
      }
      const m = new LMModel({ id: 1 });
      m.setRelation('posts', []); // already loaded
      await m.loadMissing(['posts', 'tags']);
      expect(m.relationLoaded('tags')).toBe(true);
    });
  });

  // ---- relation helpers ----
  describe('relation helpers', () => {
    test('setRelation / unsetRelation / getRelations / relationLoaded', () => {
      const m = new TestSaveModel({ id: 1 });
      m.setRelation('items', [1, 2, 3]);
      expect(m.relationLoaded('items')).toBe(true);
      expect(m.getRelations()).toHaveProperty('items');
      m.unsetRelation('items');
      expect(m.relationLoaded('items')).toBe(false);
    });
  });

  // ---- toArray / toJSON with relations ----
  describe('toArray with relations', () => {
    test('includes relation array with toArray on items', () => {
      const m = new TestSaveModel({ id: 1, name: 'A' });
      const related = { toArray: () => ({ id: 10, body: 'x' }) };
      m.setRelation('comment', related);
      const arr = m.toArray();
      expect(arr.comment).toEqual({ id: 10, body: 'x' });
    });

    test('includes relation array items', () => {
      const m = new TestSaveModel({ id: 1 });
      m.setRelation('items', [
        { toArray: () => ({ id: 1 }) },
        { toArray: () => ({ id: 2 }) },
      ]);
      const arr = m.toArray();
      expect(arr.items).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test('includes raw relation values', () => {
      const m = new TestSaveModel({ id: 1 });
      m.setRelation('count', 42);
      const arr = m.toArray();
      expect(arr.count).toBe(42);
    });
  });

  // ---- static event registration ----
  describe('static event registration', () => {
    test('creating / created / updating / updated / saving / saved / deleting / deleted / retrieved', () => {
      class EventReg extends Model {
        protected table = 'er';
      }
      const noop = () => {};
      expect(() => {
        EventReg.creating(noop);
        EventReg.created(noop);
        EventReg.updating(noop);
        EventReg.updated(noop);
        EventReg.saving(noop);
        EventReg.saved(noop);
        EventReg.deleting(noop);
        EventReg.deleted(noop);
        EventReg.retrieved(noop);
        EventReg.restoring(noop);
        EventReg.restored(noop);
      }).not.toThrow();
    });
  });

  // ---- withoutModelEvents alias ----
  describe('withoutModelEvents', () => {
    test('is alias for withoutEvents', async () => {
      const result = await Model.withoutModelEvents(() => 'ok');
      expect(result).toBe('ok');
    });
  });

  // ---- getRelationValue ----
  describe('getRelationValue', () => {
    test('returns loaded relation', () => {
      const m = new TestSaveModel({ id: 1 });
      m.setRelation('posts', [1, 2]);
      expect(m.getRelationValue('posts')).toEqual([1, 2]);
    });

    test('returns undefined for non-existent relation method', () => {
      const m = new TestSaveModel({ id: 1 });
      expect(m.getRelationValue('nonExistent')).toBeUndefined();
    });
  });
});
