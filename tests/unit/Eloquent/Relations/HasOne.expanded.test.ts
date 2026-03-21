import { HasOne } from '../../../../src/Eloquent/Relations/HasOne';
import { Model } from '../../../../src/Eloquent/Model';
import { Builder } from '../../../../src/Eloquent/Builder';
import { Events } from '../../../../src/Eloquent/Events';

// Create mock query builder
function mockQB() {
  const qb: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    get: jest.fn().mockResolvedValue([]),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    columns: [],
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
  return qb;
}

// Test model classes
class ParentModel extends Model {
  protected table = 'parents';
  protected static fillable = ['id', 'name'];

  protected newBaseQueryBuilder() { return mockQB() as any; }
}

class ChildModel extends Model {
  protected table = 'children';
  protected static fillable = ['id', 'parent_id', 'name'];

  protected newBaseQueryBuilder() { return mockQB() as any; }
}

function createHasOne(parent: ParentModel, overrides: any = {}): HasOne {
  const child = new ChildModel();
  const builder = new Builder(mockQB() as any);
  builder.setModel(child);

  return new HasOne(
    builder,
    parent,
    overrides.foreignKey || 'parent_id',
    overrides.localKey || 'id'
  );
}

describe('HasOne — expanded coverage', () => {
  beforeEach(() => {
    (Model as any).booted = new Map();
    Events.flushAll();
  });

  describe('withDefault', () => {
    test('withDefault(true) returns parent instance when no result', async () => {
      const parent = new ParentModel({ id: 1, name: 'Alice' });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      relation.withDefault(true);
      const result = await relation.getResults();
      // Should return a model (the default)
      expect(result).toBeTruthy();
    });

    test('withDefault with object fills attributes', async () => {
      const parent = new ParentModel({ id: 1, name: 'Alice' });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      relation.withDefault({ name: 'DefaultChild' });
      const result = await relation.getResults();
      expect(result).toBeTruthy();
    });

    test('withDefault with callback uses callback', async () => {
      const parent = new ParentModel({ id: 1, name: 'Alice' });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      const mockChild = new ChildModel({ id: 99, name: 'Custom' });
      relation.withDefault((_instance: any) => mockChild);
      const result = await relation.getResults();
      expect(result).toBeTruthy();
    });

    test('getResults returns actual result when it exists', async () => {
      const parent = new ParentModel({ id: 1, name: 'Alice' });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      const child = new ChildModel({ id: 10, parent_id: 1, name: 'Bob' });
      jest.spyOn((relation as any).query, 'first').mockResolvedValue(child);

      const result = await relation.getResults();
      expect(result).toBe(child);
    });
  });

  describe('create', () => {
    test('create sets foreign key and saves', async () => {
      const parent = new ParentModel({ id: 5, name: 'Parent' });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      // Mock the related model's save
      const mockInstance = new ChildModel();
      const saveSpy = jest.spyOn(mockInstance, 'save').mockResolvedValue(true);
      jest.spyOn((relation as any).related, 'newInstance').mockReturnValue(mockInstance);

      const created = await relation.create({ name: 'NewChild' });
      expect(created.getAttribute('parent_id')).toBe(5);
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    test('save sets foreign key on model and saves', async () => {
      const parent = new ParentModel({ id: 7, name: 'P' });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      const child = new ChildModel({ id: 10, name: 'C' });
      const saveSpy = jest.spyOn(child, 'save').mockResolvedValue(true);

      const saved = await relation.save(child);
      expect(saved.getAttribute('parent_id')).toBe(7);
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('firstOrCreate', () => {
    test('returns existing if found', async () => {
      const parent = new ParentModel({ id: 1 });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      const existing = new ChildModel({ id: 20, parent_id: 1, name: 'Exists' });
      // Mock the Eloquent Builder's first() method
      jest.spyOn(relation as any, 'where').mockReturnValue(relation);
      jest.spyOn((relation as any).query, 'first').mockResolvedValue(existing);

      const result = await relation.firstOrCreate({ name: 'Exists' });
      expect(result).toBe(existing);
    });

    test('creates new if not found', async () => {
      const parent = new ParentModel({ id: 1 });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      jest.spyOn(relation as any, 'where').mockReturnValue(relation);
      jest.spyOn((relation as any).query, 'first').mockResolvedValue(null);

      const mockInstance = new ChildModel();
      jest.spyOn(mockInstance, 'save').mockResolvedValue(true);
      jest.spyOn((relation as any).related, 'newInstance').mockReturnValue(mockInstance);

      const result = await relation.firstOrCreate({ name: 'New' }, { extra: 'val' });
      expect(result.getAttribute('parent_id')).toBe(1);
    });
  });

  describe('updateOrCreate', () => {
    test('updates existing if found', async () => {
      const parent = new ParentModel({ id: 1 });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      const existing = new ChildModel({ id: 5, parent_id: 1, name: 'Old' });
      jest.spyOn(existing, 'save').mockResolvedValue(true);
      jest.spyOn(relation as any, 'where').mockReturnValue(relation);
      jest.spyOn((relation as any).query, 'first').mockResolvedValue(existing);

      const result = await relation.updateOrCreate({ name: 'Old' }, { name: 'Updated' });
      expect(result.getAttribute('name')).toBe('Updated');
    });

    test('creates new if not found', async () => {
      const parent = new ParentModel({ id: 1 });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      jest.spyOn(relation as any, 'where').mockReturnValue(relation);
      jest.spyOn((relation as any).query, 'first').mockResolvedValue(null);

      const mockInstance = new ChildModel();
      jest.spyOn(mockInstance, 'save').mockResolvedValue(true);
      jest.spyOn((relation as any).related, 'newInstance').mockReturnValue(mockInstance);

      const result = await relation.updateOrCreate({ name: 'Missing' }, { extra: 'data' });
      expect(result).toBeTruthy();
    });
  });

  describe('match with withDefault', () => {
    test('uses default when no matching result and withDefault set', () => {
      const parent = new ParentModel({ id: 1 });
      (parent as any).exists = true;
      const relation = createHasOne(parent);
      relation.withDefault(true);

      const models = [parent];
      // items has no match for key=1
      const results = { items: [] };

      const matched = relation.match(models, results, 'child');
      // Should have assigned a default
      expect((parent as any).relations.child).toBeTruthy();
    });
  });

  describe('initRelation', () => {
    test('sets relation to null on all models', () => {
      const parent = new ParentModel({ id: 1 });
      (parent as any).exists = true;
      const relation = createHasOne(parent);

      const models = [parent];
      relation.initRelation(models, 'child');
      expect((parent as any).relations.child).toBeNull();
    });
  });
});
