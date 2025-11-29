/**
 * Touch and touchOwners Tests
 */

import { Model } from '../../src/Eloquent/Model';

describe('Model Touch Features', () => {
  class TestModel extends Model {
    table = 'test_models';
    timestamps = true;
    
    async save(): Promise<boolean> {
      // Mock save that updates timestamps
      if (this.timestamps) {
        const time = new Date();
        this.setAttribute('updated_at', time);
        if (!this.exists) {
          this.setAttribute('created_at', time);
        }
      }
      this.exists = true;
      this.syncOriginal();
      return true;
    }
  }

  test('touch() updates timestamps', async () => {
    const model = new TestModel();
    model.name = 'Test';
    await model.save();
    
    const originalUpdatedAt = model.getAttribute('updated_at');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await model.touch();
    
    const newUpdatedAt = model.getAttribute('updated_at');
    expect(newUpdatedAt).not.toEqual(originalUpdatedAt);
    expect(newUpdatedAt > originalUpdatedAt).toBe(true);
  });

  test('touchOwners() touches parent relations', async () => {
    class Comment extends Model {
      table = 'comments';
      timestamps = true;
      touches = ['post'];
      relations: any = {};
    }

    class Post extends Model {
      table = 'posts';
      timestamps = true;
      
      async touch(): Promise<boolean> {
        const time = new Date();
        this.setAttribute('updated_at', time);
        this.wasUpdatedAt = time;
        return true;
      }
      
      wasUpdatedAt?: Date;
    }

    const post = new Post();
    const comment = new Comment();
    comment.relations.post = post;

    // Call touchOwners
    await comment.touchOwners();

    expect(post.wasUpdatedAt).toBeDefined();
  });

  test('touch() returns false when timestamps disabled', async () => {
    const model = new TestModel();
    model.timestamps = false;
    
    const result = await model.touch();
    expect(result).toBe(false);
  });
});
