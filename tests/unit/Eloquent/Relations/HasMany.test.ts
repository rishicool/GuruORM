import { HasMany } from '../../../../src/Eloquent/Relations/HasMany';
import { Collection } from '../../../../src/Eloquent/Collection';
import { Model } from '../../../../src/Eloquent/Model';

function mockModel(attrs: Record<string, any> = {}, exists = true) {
  const m = Object.create(Model.prototype);
  m.attributes = { ...attrs };
  m.relations = {};
  m.exists = exists;
  m.getAttribute = (key: string) => m.attributes[key];
  m.setAttribute = (key: string, val: any) => { m.attributes[key] = val; };
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
    get: jest.fn().mockResolvedValue(new Collection()),
    first: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (attrs: any) => mockModel(attrs)),
    model: mockModel({ id: 1 }),
    getModel: jest.fn().mockReturnValue(mockModel({ id: 1 })),
  } as any;
}

describe('Eloquent / Relations / HasMany', () => {
  describe('addConstraints', () => {
    test('adds where constraint when parent exists', () => {
      const query = mockQuery();
      const parent = mockModel({ id: 5 });
      new HasMany(query, parent, 'user_id', 'id');
      expect(query.where).toHaveBeenCalledWith('user_id', '=', 5);
    });

    test('skips constraints when parent does not exist', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      new HasMany(query, parent, 'user_id', 'id');
      expect(query.where).not.toHaveBeenCalled();
    });
  });

  describe('addEagerConstraints', () => {
    test('adds whereIn for model keys', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasMany(query, parent, 'user_id', 'id');

      const models = [mockModel({ id: 1 }), mockModel({ id: 2 })];
      rel.addEagerConstraints(models);
      expect(query.whereIn).toHaveBeenCalledWith('user_id', [1, 2]);
    });

    test('skips whereIn when keys are empty', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasMany(query, parent, 'user_id', 'id');

      rel.addEagerConstraints([mockModel({})]);
      expect(query.whereIn).not.toHaveBeenCalled();
    });
  });

  describe('initRelation', () => {
    test('sets empty Collection on each model', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasMany(query, parent, 'user_id', 'id');

      const models = [mockModel({ id: 1 }), mockModel({ id: 2 })];
      rel.initRelation(models, 'posts');

      expect(models[0].relations.posts).toBeInstanceOf(Collection);
      expect(models[0].relations.posts.length).toBe(0);
    });
  });

  describe('match', () => {
    test('matches results to parent models via foreign key', () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasMany(query, parent, 'user_id', 'id');

      const model1 = mockModel({ id: 1 });
      const model2 = mockModel({ id: 2 });
      model1.relations = { posts: new Collection() };
      model2.relations = { posts: new Collection() };

      const post1 = mockModel({ id: 10, user_id: 1 });
      const post2 = mockModel({ id: 11, user_id: 1 });
      const post3 = mockModel({ id: 12, user_id: 2 });

      rel.match([model1, model2], [post1, post2, post3], 'posts');

      expect(model1.relations.posts).toBeInstanceOf(Collection);
      expect(model1.relations.posts.length).toBe(2);
      expect(model2.relations.posts.length).toBe(1);
    });
  });

  describe('getResults', () => {
    test('returns query.get() result', async () => {
      const query = mockQuery();
      const parent = mockModel({}, false);
      const rel = new HasMany(query, parent, 'user_id', 'id');

      const result = await rel.getResults();
      expect(query.get).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Collection);
    });
  });
});
