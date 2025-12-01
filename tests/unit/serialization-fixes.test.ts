import { Model } from '../../src/Eloquent/Model';
import { Collection as EloquentCollection } from '../../src/Eloquent/Collection';
import { Collection as SupportCollection } from '../../src/Support/Collection';

describe('Serialization Fixes', () => {
  class TestModel extends Model {
    protected table = 'test_models';
    protected static fillable = ['id', 'name', 'email', 'title'];
    protected fillable = ['id', 'name', 'email', 'title'];
    protected guarded: string[] = [];
  }

  describe('Model.toJSON()', () => {
    it('should return plain object, not string', () => {
      const model = new TestModel({ id: 1, name: 'Test', email: 'test@example.com' });
      const result = model.toJSON();

      // Should be an object
      expect(typeof result).toBe('object');
      expect(result).not.toBeInstanceOf(String);
      
      // Should have the attributes
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should work correctly with JSON.stringify()', () => {
      const model = new TestModel({ id: 1, name: 'Test' });
      const json = JSON.stringify(model);
      
      // Should be valid JSON
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('id', 1);
      expect(parsed).toHaveProperty('name', 'Test');
      
      // Should NOT have double-escaped quotes
      expect(json).not.toContain('\\"id\\"');
      expect(json).toContain('"id":1');
    });
  });

  describe('Model.toArray()', () => {
    it('should return plain object', () => {
      const model = new TestModel({ id: 1, name: 'Test' });
      const result = model.toArray();

      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test');
    });
  });

  describe('Eloquent Collection.toJSON()', () => {
    it('should return array of objects, not string', () => {
      const model1 = new TestModel({ id: 1, name: 'First' });
      const model2 = new TestModel({ id: 2, name: 'Second' });
      const collection = new EloquentCollection(model1, model2);

      const result = collection.toJSON();

      // Should be an array
      expect(Array.isArray(result)).toBe(true);
      expect(typeof result).toBe('object');
      
      // Should have 2 items
      expect(result).toHaveLength(2);
      
      // Each item should be an object (not a string)
      expect(typeof result[0]).toBe('object');
      expect(typeof result[1]).toBe('object');
      expect(result[0]).toHaveProperty('id', 1);
      expect(result[1]).toHaveProperty('id', 2);
    });

    it('should work correctly with JSON.stringify()', () => {
      const model1 = new TestModel({ id: 1, name: 'First' });
      const model2 = new TestModel({ id: 2, name: 'Second' });
      const collection = new EloquentCollection(model1, model2);

      const json = JSON.stringify(collection);
      const parsed = JSON.parse(json);

      // Should be an array
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      
      // Should NOT have double-stringified data
      expect(json).not.toContain('\\"{');
      expect(json).not.toContain('}\\"');
      
      // Should have proper structure
      expect(parsed[0]).toHaveProperty('id', 1);
      expect(parsed[0]).toHaveProperty('name', 'First');
      expect(parsed[1]).toHaveProperty('id', 2);
      expect(parsed[1]).toHaveProperty('name', 'Second');
    });
  });

  describe('Eloquent Collection.toArray()', () => {
    it('should convert models to plain objects', () => {
      const model1 = new TestModel({ id: 1, name: 'First' });
      const model2 = new TestModel({ id: 2, name: 'Second' });
      const collection = new EloquentCollection(model1, model2);

      const result = collection.toArray();

      // Should be an array
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      
      // Each item should be a plain object
      expect(result[0]).toEqual({ id: 1, name: 'First' });
      expect(result[1]).toEqual({ id: 2, name: 'Second' });
      
      // Should NOT be Model instances
      expect(result[0]).not.toBeInstanceOf(TestModel);
      expect(result[1]).not.toBeInstanceOf(TestModel);
    });
  });

  describe('Support Collection.toJSON()', () => {
    it('should return array, not string', () => {
      const collection = new SupportCollection(
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' }
      );

      const result = collection.toJSON();

      // Should be an array
      expect(Array.isArray(result)).toBe(true);
      expect(typeof result).toBe('object');
      expect(result).toHaveLength(2);
    });

    it('should work correctly with JSON.stringify()', () => {
      const collection = new SupportCollection(
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' }
      );

      const json = JSON.stringify(collection);
      const parsed = JSON.parse(json);

      // Should be an array
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      
      // Should NOT have double-stringification
      expect(json).not.toContain('\\"{');
      expect(parsed[0]).toHaveProperty('id', 1);
      expect(parsed[1]).toHaveProperty('id', 2);
    });
  });

  describe('Express.js res.json() simulation', () => {
    it('should work correctly with single model', () => {
      const model = new TestModel({ id: 1, name: 'Test', email: 'test@example.com' });
      
      // Simulate what Express does: JSON.stringify(data)
      const responseBody = JSON.stringify(model);
      const clientReceives = JSON.parse(responseBody);

      // Client should receive a proper object
      expect(typeof clientReceives).toBe('object');
      expect(clientReceives).toHaveProperty('id', 1);
      expect(clientReceives).toHaveProperty('name', 'Test');
      expect(clientReceives).toHaveProperty('email', 'test@example.com');
    });

    it('should work correctly with collection', () => {
      const models = new EloquentCollection(
        new TestModel({ id: 1, name: 'First' }),
        new TestModel({ id: 2, name: 'Second' }),
        new TestModel({ id: 3, name: 'Third' })
      );
      
      // Simulate what Express does: JSON.stringify(data)
      const responseBody = JSON.stringify(models);
      const clientReceives = JSON.parse(responseBody);

      // Client should receive a proper array
      expect(Array.isArray(clientReceives)).toBe(true);
      expect(clientReceives).toHaveLength(3);
      
      // Each item should be an object (not a string!)
      expect(typeof clientReceives[0]).toBe('object');
      expect(typeof clientReceives[1]).toBe('object');
      expect(typeof clientReceives[2]).toBe('object');
      
      // Should have correct data
      expect(clientReceives[0]).toEqual({ id: 1, name: 'First' });
      expect(clientReceives[1]).toEqual({ id: 2, name: 'Second' });
      expect(clientReceives[2]).toEqual({ id: 3, name: 'Third' });
    });

    it('should work correctly with paginated results', () => {
      const models = new EloquentCollection(
        new TestModel({ id: 1, name: 'First' }),
        new TestModel({ id: 2, name: 'Second' })
      );

      const paginatedResult = {
        data: models,
        total: 10,
        perPage: 2,
        currentPage: 1,
        lastPage: 5
      };

      // Simulate what Express does: JSON.stringify(data)
      const responseBody = JSON.stringify(paginatedResult);
      const clientReceives = JSON.parse(responseBody);

      // Should have correct structure
      expect(clientReceives).toHaveProperty('total', 10);
      expect(clientReceives).toHaveProperty('perPage', 2);
      expect(clientReceives).toHaveProperty('currentPage', 1);
      
      // Data should be an array of objects (not strings!)
      expect(Array.isArray(clientReceives.data)).toBe(true);
      expect(clientReceives.data).toHaveLength(2);
      expect(typeof clientReceives.data[0]).toBe('object');
      expect(typeof clientReceives.data[1]).toBe('object');
      
      // Should NOT have double-stringification
      expect(responseBody).not.toContain('\\"{');
      expect(responseBody).not.toContain('}\\"');
      
      // Should have correct data
      expect(clientReceives.data[0]).toEqual({ id: 1, name: 'First' });
      expect(clientReceives.data[1]).toEqual({ id: 2, name: 'Second' });
    });
  });

  describe('Nested relationships serialization', () => {
    class User extends Model {
      protected table = 'users';
      protected static fillable = ['id', 'name'];
      protected fillable = ['id', 'name'];
      protected guarded: string[] = [];
    }

    class Post extends Model {
      protected table = 'posts';
      protected static fillable = ['id', 'title'];
      protected fillable = ['id', 'title'];
      protected guarded: string[] = [];
    }

    it('should properly serialize models with loaded relationships', () => {
      const user = new User({ id: 1, name: 'John' });
      const post1 = new Post({ id: 10, title: 'Post 1' });
      const post2 = new Post({ id: 20, title: 'Post 2' });
      
      // Simulate loaded relationship
      (user as any).relations = {
        posts: new EloquentCollection(post1, post2)
      };

      const json = JSON.stringify(user);
      const parsed = JSON.parse(json);

      // Should have user data
      expect(parsed).toHaveProperty('id', 1);
      expect(parsed).toHaveProperty('name', 'John');
      
      // Should have posts array (not string!)
      expect(Array.isArray(parsed.posts)).toBe(true);
      expect(parsed.posts).toHaveLength(2);
      expect(typeof parsed.posts[0]).toBe('object');
      expect(parsed.posts[0]).toEqual({ id: 10, title: 'Post 1' });
      expect(parsed.posts[1]).toEqual({ id: 20, title: 'Post 2' });
    });
  });
});
