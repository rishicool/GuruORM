import { HasOne } from '../../../../src/Eloquent/Relations/HasOne';
import { Model } from '../../../../src/Eloquent/Model';

function mockModel(attrs: Record<string, any> = {}, exists = true) {
  const m = Object.create(Model.prototype);
  m.attributes = { ...attrs };
  m.relations = {};
  m.exists = exists;
  m.getAttribute = (key: string) => m.attributes[key];
  m.setAttribute = (key: string, val: any) => { m.attributes[key] = val; };
  m.forceFill = function(a: Record<string, any>) { Object.assign(this.attributes, a); return this; };
  m.getKey = () => m.attributes.id;
  m.getKeyName = () => 'id';
  m.modelExists = () => exists;
  return m;
}

function mockQuery() {
  return {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    model: mockModel({ id: 1 }),
    getModel: jest.fn().mockReturnValue(mockModel({ id: 1 })),
  } as any;
}

describe('Eloquent / Relations / HasOne', () => {
  describe('addConstraints', () => {
    test('adds where constraint when parent exists', () => {
      const query = mockQuery();
      const parent = mockModel({ id: 5 });
      new HasOne(query, parent, 'user_id', 'id');
      expect(query.where).toHaveBeenCalledWith('user_id', '=', 5);
    });

    test('skips when parent does not exist', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      new HasOne(query, parent, 'user_id', 'id');
      expect(query.where).not.toHaveBeenCalled();
    });
  });

  describe('addEagerConstraints', () => {
    test('adds whereIn for parent keys', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');

      const models = [mockModel({ id: 1 }), mockModel({ id: 2 })];
      rel.addEagerConstraints(models);
      expect(query.whereIn).toHaveBeenCalledWith('user_id', [1, 2]);
    });
  });

  describe('initRelation', () => {
    test('sets null on each model', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');

      const models = [mockModel({ id: 1 }), mockModel({ id: 2 })];
      rel.initRelation(models, 'profile');
      expect(models[0].relations.profile).toBeNull();
      expect(models[1].relations.profile).toBeNull();
    });
  });

  describe('match', () => {
    test('matches first result to each parent', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');

      const user1 = mockModel({ id: 1 });
      const user2 = mockModel({ id: 2 });
      user1.relations = {};
      user2.relations = {};

      const profile1 = mockModel({ id: 10, user_id: 1 });
      const profile2 = mockModel({ id: 11, user_id: 2 });

      rel.match([user1, user2], [profile1, profile2], 'profile');

      expect(user1.relations.profile).toBe(profile1);
      expect(user2.relations.profile).toBe(profile2);
    });
  });

  describe('getResults', () => {
    test('returns query.first() result', async () => {
      const query = mockQuery();
      const result = mockModel({ id: 10 });
      query.first.mockResolvedValue(result);
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');

      expect(await rel.getResults()).toBe(result);
    });

    test('returns null when no result and no default', async () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');

      expect(await rel.getResults()).toBeNull();
    });
  });

  describe('withDefault', () => {
    test('returns default model when result is null', async () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');
      rel.withDefault();

      const result = await rel.getResults();
      expect(result).toBeDefined();
    });

    test('returns default model with attributes', async () => {
      const query = mockQuery();
      // Make the model returned by getDefaultFor support forceFill
      const mockRelated = mockModel({ id: 1 });
      mockRelated.constructor = class FakeModel {
        attributes: any = {};
        exists = false;
        forceFill(a: any) { Object.assign(this.attributes, a); return this; }
      };
      query.model = mockRelated;

      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');
      rel.withDefault({ bio: 'No bio' });

      const result = await rel.getResults();
      expect(result).toBeDefined();
    });

    test('withDefault with callback', async () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');

      const cb = jest.fn((m: any) => { m.setAttribute('bio', 'custom'); return m; });
      rel.withDefault(cb);

      const result = await rel.getResults();
      expect(cb).toHaveBeenCalled();
    });

    test('withDefault(true) returns model instance', async () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');
      rel.withDefault(true);

      const result = await rel.getResults();
      expect(result).toBeDefined();
    });

    test('returns fluent this', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasOne(query, parent, 'user_id', 'id');
      expect(rel.withDefault()).toBe(rel);
    });
  });
});
