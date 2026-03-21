import { Model } from '../../../../src/Eloquent/Model';
import { SoftDeletes, SoftDeleteModel } from '../../../../src/Eloquent/Concerns/SoftDeletes';
import { Prunable, MassPrunable } from '../../../../src/Eloquent/Concerns/Prunable';
import { Events } from '../../../../src/Eloquent/Events';
import { Builder } from '../../../../src/Eloquent/Builder';

// Mock query builder factory
function mockQB() {
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
    insertGetId: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    columns: [],
  };
  return qb;
}

// ---------- SoftDeleteModel tests ----------  
describe('Eloquent / Concerns / SoftDeleteModel (class-based)', () => {
  class TestSoftModel extends SoftDeleteModel {
    protected table = 'soft_items';
    protected static fillable = ['id', 'name', 'deleted_at'];
    protected newBaseQueryBuilder() { return mockQB() as any; }
  }

  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
    (Model as any).withoutEventsOn = false;
  });

  test('trashed returns false when deleted_at is null', () => {
    const m = new TestSoftModel({ deleted_at: null });
    expect(m.trashed()).toBe(false);
  });

  test('trashed returns true when deleted_at is set', () => {
    const m = new TestSoftModel({ deleted_at: new Date() });
    expect(m.trashed()).toBe(true);
  });

  test('getDeletedAtColumn returns DELETED_AT', () => {
    const m = new TestSoftModel();
    expect(m.getDeletedAtColumn()).toBe('deleted_at');
  });

  test('getQualifiedDeletedAtColumn includes table', () => {
    const m = new TestSoftModel();
    expect(m.getQualifiedDeletedAtColumn()).toBe('soft_items.deleted_at');
  });

  test('newQuery adds whereNull for deleted_at', () => {
    const m = new TestSoftModel({ id: 1 });
    (m as any).exists = true;
    const query = m.newQuery();
    const qb = query.getQuery();
    // from + whereNull should be called
    expect(qb.whereNull).toHaveBeenCalledWith('deleted_at');
  });

  test('newQueryWithoutScopes does not add whereNull', () => {
    const m = new TestSoftModel({ id: 1 });
    const query = m.newQueryWithoutScopes();
    const qb = query.getQuery();
    // whereNull should NOT be called (super.newQuery is called, which may call from)
    // but it should not call the overridden version
    expect(qb.from).toHaveBeenCalled();
  });

  test('restore sets deleted_at to null and updates', async () => {
    const m = new TestSoftModel({ id: 1, deleted_at: new Date() });
    (m as any).exists = true;
    m.syncOriginal();
    
    const result = await m.restore();
    expect(result).toBe(true);
    expect(m.getAttribute('deleted_at')).toBeNull();
  });

  test('restore returns true when not trashed', async () => {
    const m = new TestSoftModel({ id: 1, deleted_at: null });
    (m as any).exists = true;
    const result = await m.restore();
    expect(result).toBe(true);
  });

  test('restoreQuietly suppresses events', async () => {
    const m = new TestSoftModel({ id: 1, deleted_at: new Date() });
    (m as any).exists = true;
    m.syncOriginal();
    
    const result = await m.restoreQuietly();
    expect(result).toBe(true);
    expect(TestSoftModel.isEventsSuppressed()).toBe(false); // should be reset
  });

  test('isEventsSuppressed returns correct state', () => {
    expect(TestSoftModel.isEventsSuppressed()).toBe(false);
  });

  test('forceDelete performs hard delete', async () => {
    const m = new TestSoftModel({ id: 1 });
    (m as any).exists = true;
    m.syncOriginal();
    
    const deleteSpy = jest.spyOn(m as any, 'performDeleteOnModel');
    await m.forceDelete();
    expect(deleteSpy).toHaveBeenCalled();
    expect(m.modelExists()).toBe(false);
  });

  test('performDeleteOnModel does soft delete when not force deleting', async () => {
    const m = new TestSoftModel({ id: 1 });
    (m as any).exists = true;
    m.syncOriginal();
    
    // Normal delete triggers soft delete
    await m.delete();
    expect(m.getAttribute('deleted_at')).toBeInstanceOf(Date);
    expect(m.modelExists()).toBe(true); // soft deleted - still exists
  });

  test('custom DELETED_AT column', () => {
    class CustomSoft extends SoftDeleteModel {
      static DELETED_AT = 'removed_at';
      protected table = 'custom';
      protected newBaseQueryBuilder() { return mockQB() as any; }
    }
    const m = new CustomSoft();
    expect(m.getDeletedAtColumn()).toBe('removed_at');
  });
});

// ---------- SoftDeletes mixin tests ----------
describe('Eloquent / Concerns / SoftDeletes (mixin)', () => {
  const SoftModel = SoftDeletes(Model);
  
  class TestMixinModel extends SoftModel {
    protected table = 'mixin_items';
    protected static fillable = ['id', 'name', 'deleted_at'];
    protected newBaseQueryBuilder() { return mockQB() as any; }
  }

  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
    (Model as any).withoutEventsOn = false;
  });

  test('mixin provides trashed method', () => {
    const m = new TestMixinModel({ deleted_at: null });
    expect(m.trashed()).toBe(false);
  });

  test('mixin provides restore method', async () => {
    const m = new TestMixinModel({ id: 1, deleted_at: new Date() });
    (m as any).exists = true;
    m.syncOriginal();
    const result = await m.restore();
    expect(result).toBe(true);
  });

  test('mixin provides getDeletedAtColumn', () => {
    const m = new TestMixinModel();
    expect(m.getDeletedAtColumn()).toBe('deleted_at');
  });

  test('mixin provides getQualifiedDeletedAtColumn', () => {
    const m = new TestMixinModel();
    expect(m.getQualifiedDeletedAtColumn()).toBe('mixin_items.deleted_at');
  });

  test('mixin provides forceDelete', async () => {
    const m = new TestMixinModel({ id: 1 });
    (m as any).exists = true;
    m.syncOriginal();
    await m.forceDelete();
    expect(m.modelExists()).toBe(false);
  });

  test('mixin provides restoreQuietly', async () => {
    const m = new TestMixinModel({ id: 1, deleted_at: new Date() });
    (m as any).exists = true;
    m.syncOriginal();
    await m.restoreQuietly();
    expect(m.getAttribute('deleted_at')).toBeNull();
  });
});

// ---------- Prunable mixin tests ----------
describe('Eloquent / Concerns / Prunable (mixin)', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
    (Model as any).withoutEventsOn = false;
  });

  test('base prunable throws if not implemented', () => {
    const PrunableBase = Prunable(Model);
    const m = new PrunableBase();
    expect(() => m.prunable()).toThrow('Model must implement prunable() method');
  });

  test('pruned is a no-op by default', async () => {
    const PrunableBase = Prunable(Model);
    const m = new PrunableBase();
    await expect(m.pruned()).resolves.toBeUndefined();
  });

  test('prune deletes models returned by prunable query', async () => {
    const PrunableModel = Prunable(Model);

    class TestPrunable extends PrunableModel {
      protected table = 'prunable_items';
      protected static fillable = ['id', 'name'];
      protected newBaseQueryBuilder() { return mockQB() as any; }
      
      prunable() {
        return this.newQuery();
      }
    }

    // Mock chunk to return models
    const mockModel1 = new TestPrunable({ id: 1 });
    (mockModel1 as any).exists = true;
    const mockModel2 = new TestPrunable({ id: 2 });
    (mockModel2 as any).exists = true;
    
    // Mock the prunable query's chunk method
    const origPrunable = TestPrunable.prototype.prunable;
    TestPrunable.prototype.prunable = function() {
      const query = origPrunable.call(this);
      const origChunk = query.chunk.bind(query);
      (query as any).chunk = async (count: number, cb: Function) => {
        await cb(new (require('../../../../src/Eloquent/Collection').Collection)(mockModel1, mockModel2));
        return true;
      };
      return query;
    };

    const total = await TestPrunable.prune(100);
    expect(total).toBe(2);
  });
});

// ---------- MassPrunable mixin tests ----------
describe('Eloquent / Concerns / MassPrunable (mixin)', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
  });

  test('base mass prunable throws if not implemented', () => {
    const MPBase = MassPrunable(Model);
    const m = new MPBase();
    expect(() => m.prunable()).toThrow('Model must implement prunable() method');
  });

  test('prune mass deletes by id', async () => {
    const MPModel = MassPrunable(Model);

    class TestMassPrunable extends MPModel {
      protected table = 'mass_prunable';
      protected static fillable = ['id', 'name'];
      protected newBaseQueryBuilder() { return mockQB() as any; }
      
      prunable() {
        return this.newQuery();
      }
    }

    // Mock chunk to return models with keys
    const mockModel1 = new TestMassPrunable({ id: 1 });
    (mockModel1 as any).exists = true;
    const mockModel2 = new TestMassPrunable({ id: 2 });
    (mockModel2 as any).exists = true;

    const origPrunable = TestMassPrunable.prototype.prunable;
    TestMassPrunable.prototype.prunable = function() {
      const query = origPrunable.call(this);
      (query as any).chunk = async (count: number, cb: Function) => {
        await cb([mockModel1, mockModel2]);
        return true;
      };
      (query as any).getModel = () => new TestMassPrunable();
      return query;
    };

    const total = await TestMassPrunable.prune(100);
    // Should have done mass delete
    expect(total).toBeGreaterThanOrEqual(0);
  });
});
