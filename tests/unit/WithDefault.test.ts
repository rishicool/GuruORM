/**
 * withDefault() Tests for BelongsTo and HasOne relations
 */

import { Model } from '../../src/Eloquent/Model';
import { BelongsTo } from '../../src/Eloquent/Relations/BelongsTo';
import { HasOne } from '../../src/Eloquent/Relations/HasOne';
import { Builder } from '../../src/Eloquent/Builder';

describe('Relation withDefault() Feature', () => {
  class User extends Model {
    table = 'users';
  }

  class Post extends Model {
    table = 'posts';
  }

  class Profile extends Model {
    table = 'profiles';
  }

  describe('BelongsTo withDefault()', () => {
    test('returns default model when relation is null', async () => {
      const post = new Post();
      const userModel = new User();
      const query = {
        model: userModel,
        getModel: () => userModel,
        first: jest.fn().mockResolvedValue(null)
      } as any;
      
      const relation = new BelongsTo(query, post, 'user_id', 'id');
      relation.withDefault();

      const result = await relation.getResults();
      
      expect(result).toBeInstanceOf(User);
      expect(result.exists).toBe(false);
    });

    test('returns default model with attributes', async () => {
      const post = new Post();
      const userModel = new User();
      const query = {
        model: userModel,
        getModel: () => userModel,
        first: jest.fn().mockResolvedValue(null)
      } as any;
      
      const relation = new BelongsTo(query, post, 'user_id', 'id');
      relation.withDefault({ name: 'Guest', email: 'guest@example.com' });

      const result = await relation.getResults();
      
      expect((result as any).name).toBe('Guest');
      expect((result as any).email).toBe('guest@example.com');
    });

    test('returns default model from callback', async () => {
      const post = new Post();
      const userModel = new User();
      const query = {
        model: userModel,
        getModel: () => userModel,
        first: jest.fn().mockResolvedValue(null)
      } as any;
      
      const relation = new BelongsTo(query, post, 'user_id', 'id');
      relation.withDefault((user: User) => {
        user.setAttribute('name', 'Anonymous');
        return user;
      });

      const result = await relation.getResults();
      
      expect((result as any).name).toBe('Anonymous');
    });

    test('applies withDefault in eager loading match()', () => {
      const post1 = new Post();
      post1.setAttribute('id', 1);
      post1.setAttribute('user_id', 999); // Non-existent user
      
      const post2 = new Post();
      post2.setAttribute('id', 2);
      post2.setAttribute('user_id', 1); // Exists

      const user = new User();
      user.setAttribute('id', 1);
      user.setAttribute('name', 'John');

      const userModel = new User();
      const query = {
        model: userModel,
        getModel: () => userModel
      } as any;
      
      const relation = new BelongsTo(query, post1, 'user_id', 'id');
      relation.withDefault({ name: 'Guest' });

      const models = relation.match([post1, post2], [user], 'user');

      expect(models[0]['relations']['user']).toBeDefined();
      expect((models[0]['relations']['user'] as any).name).toBe('Guest');
      expect((models[1]['relations']['user'] as any).name).toBe('John');
    });
  });

  describe('HasOne withDefault()', () => {
    test('returns default model when relation is null', async () => {
      const user = new User();
      const profileModel = new Profile();
      const query = {
        model: profileModel,
        getModel: () => profileModel,
        first: jest.fn().mockResolvedValue(null)
      } as any;
      
      const relation = new HasOne(query, user, 'user_id', 'id');
      relation.withDefault();

      const result = await relation.getResults();
      
      expect(result).toBeInstanceOf(Profile);
      expect(result.exists).toBe(false);
    });

    test('returns default model with attributes', async () => {
      const user = new User();
      const profileModel = new Profile();
      const query = {
        model: profileModel,
        getModel: () => profileModel,
        first: jest.fn().mockResolvedValue(null)
      } as any;
      
      const relation = new HasOne(query, user, 'user_id', 'id');
      relation.withDefault({ bio: 'No bio yet', avatar: null });

      const result = await relation.getResults();
      
      expect((result as any).bio).toBe('No bio yet');
      expect((result as any).avatar).toBeNull();
    });
  });
});
