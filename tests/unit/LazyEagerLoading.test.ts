import { Model } from '../../src/Eloquent/Model';
import { HasMany } from '../../src/Eloquent/Relations/HasMany';
import { BelongsTo } from '../../src/Eloquent/Relations/BelongsTo';
import { Builder as QueryBuilder } from '../../src/Query/Builder';
import { Builder as EloquentBuilder } from '../../src/Eloquent/Builder';

// Mock models
class Post extends Model {
  protected table = 'posts';
  public id?: number;
  public user_id?: number;
  public title?: string;
  public published?: boolean;
  
  comments() {
    return this.hasMany(Comment, 'post_id');
  }
  
  author() {
    return this.belongsTo(User as any, 'user_id');
  }
  
  // Helper to access relations for testing
  getRelation(name: string) {
    return (this as any).relations[name];
  }
}

class Comment extends Model {
  protected table = 'comments';
  public id?: number;
  public post_id?: number;
  public content?: string;
  public approved?: boolean;
  
  post() {
    return this.belongsTo(Post as any, 'post_id');
  }
  
  // Helper to access relations for testing
  getRelation(name: string) {
    return (this as any).relations[name];
  }
}

class User extends Model {
  protected table = 'users';
  public id?: number;
  public name?: string;
  
  posts() {
    return this.hasMany(Post as any, 'user_id');
  }
  
  // Helper to access relations for testing
  getRelation(name: string) {
    return (this as any).relations[name];
  }
  
  setRelation(name: string, value: any): this {
    (this as any).relations[name] = value;
    return this;
  }
}

describe('Constrained Lazy Eager Loading', () => {
  let mockConnection: any;
  let mockQueryBuilder: any;
  let mockEloquentBuilder: any;

  beforeEach(() => {
    // Mock query builder
    mockQueryBuilder = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue([]),
      first: jest.fn().mockResolvedValue(null),
    };

    // Mock connection
    mockConnection = {
      table: jest.fn().mockReturnValue(mockQueryBuilder),
      query: jest.fn().mockReturnValue(mockQueryBuilder),
      getName: jest.fn().mockReturnValue('mysql'),
    };

    // Set up Model static connection
    (Model as any).connectionResolver = {
      connection: jest.fn().mockReturnValue(mockConnection),
    };
  });

  describe('load() with constraints', () => {
    it('should load relation with where constraint', async () => {
      const user = new User();
      user.id = 1;
      user.name = 'John Doe';

      // Mock posts data
      const mockPosts = [
        { id: 1, user_id: 1, title: 'Post 1', published: true },
        { id: 2, user_id: 1, title: 'Post 2', published: true },
      ];

      mockQueryBuilder.get.mockResolvedValueOnce(mockPosts);

      // Load posts with published = true constraint
      await user.load({
        posts: (query: QueryBuilder) => {
          query.where('published', true);
        }
      });

      expect(user.getRelation('posts')).toBeDefined();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('published', true);
    });

    it('should load multiple relations with different constraints', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];

      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load({
        posts: (query: QueryBuilder) => {
          query.where('published', true);
        }
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('published', true);
    });

    it('should support ordering in constraints', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [
        { id: 2, user_id: 1, title: 'Post 2' },
        { id: 1, user_id: 1, title: 'Post 1' },
      ];

      mockQueryBuilder.get.mockResolvedValue(mockPosts);
      mockQueryBuilder.orderBy = jest.fn().mockReturnThis();

      await user.load({
        posts: (query: QueryBuilder) => {
          query.where('published', true).orderBy('created_at', 'desc');
        }
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('published', true);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('should support limit in constraints', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [
        { id: 1, user_id: 1, title: 'Post 1' },
        { id: 2, user_id: 1, title: 'Post 2' },
      ];

      mockQueryBuilder.get.mockResolvedValue(mockPosts);
      mockQueryBuilder.limit = jest.fn().mockReturnThis();

      await user.load({
        posts: (query: QueryBuilder) => {
          query.limit(5);
        }
      });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('should work with string relations (backward compatibility)', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load('posts');

      expect(user.getRelation('posts')).toBeDefined();
    });

    it('should work with array of relations (backward compatibility)', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load(['posts']);

      expect(user.getRelation('posts')).toBeDefined();
    });
  });

  describe('loadMissing() with constraints', () => {
    it('should only load missing relations', async () => {
      const user = new User();
      user.id = 1;

      // Pre-load posts
      user.setRelation('posts', [{ id: 1, user_id: 1, title: 'Post 1' }]);

      const getSpy = jest.spyOn(mockQueryBuilder, 'get');

      await user.loadMissing({
        posts: (query: QueryBuilder) => {
          query.where('published', true);
        }
      });

      // Should not have called get since posts already loaded
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('should load relation with constraints if not already loaded', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.loadMissing({
        posts: (query: QueryBuilder) => {
          query.where('published', true);
        }
      });

      expect(user.getRelation('posts')).toBeDefined();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('published', true);
    });

    it('should work with string relations (backward compatibility)', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.loadMissing('posts');

      expect(user.getRelation('posts')).toBeDefined();
    });

    it('should work with array of relations (backward compatibility)', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.loadMissing(['posts']);

      expect(user.getRelation('posts')).toBeDefined();
    });
  });

  describe('nested relations with constraints', () => {
    it('should handle nested relation loading with constraints', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [
        { id: 1, user_id: 1, title: 'Post 1' },
        { id: 2, user_id: 1, title: 'Post 2' },
      ];

      const mockComments = [
        { id: 1, post_id: 1, content: 'Comment 1', approved: true },
        { id: 2, post_id: 1, content: 'Comment 2', approved: true },
      ];

      mockQueryBuilder.get
        .mockResolvedValueOnce(mockPosts) // First call for posts
        .mockResolvedValue(mockComments); // Subsequent calls for comments

      // Load posts.comments with constraint on comments
      await user.load({
        'posts.comments': (query: QueryBuilder) => {
          query.where('approved', true);
        }
      });

      expect(user.getRelation('posts')).toBeDefined();
      // The constraint should be applied when loading comments
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('approved', true);
    });
  });

  describe('complex constraint scenarios', () => {
    it('should handle multiple where clauses in constraint', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load({
        posts: (query: QueryBuilder) => {
          query
            .where('published', true)
            .where('featured', true);
        }
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('published', true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('featured', true);
    });

    it('should handle whereIn constraints', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load({
        posts: (query: QueryBuilder) => {
          query.whereIn('status', ['published', 'featured']);
        }
      });

      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('status', ['published', 'featured']);
    });

    it('should handle select constraints', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load({
        posts: (query: QueryBuilder) => {
          query.select('id', 'title', 'user_id');
        }
      });

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('id', 'title', 'user_id');
    });
  });

  describe('edge cases', () => {
    it('should handle empty constraints gracefully', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load({
        posts: (query: QueryBuilder) => {
          // Empty constraint - should just load normally
        }
      });

      expect(user.getRelation('posts')).toBeDefined();
    });

    it('should handle null constraint function', async () => {
      const user = new User();
      user.id = 1;

      const mockPosts = [{ id: 1, user_id: 1, title: 'Post 1' }];
      mockQueryBuilder.get.mockResolvedValue(mockPosts);

      await user.load({
        posts: null as any
      });

      expect(user.getRelation('posts')).toBeDefined();
    });
  });
});
