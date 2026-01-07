# Complete Tutorial: Building a Blog with GuruORM

This tutorial will walk you through building a complete blog application using GuruORM, demonstrating all the major features in a practical, real-world context.

## What We'll Build

A blog application with:
- Users (authentication)
- Posts with categories and tags
- Comments on posts
- User profiles
- Post likes

## Table of Contents

1. [Project Setup](#project-setup)
2. [Database Configuration](#database-configuration)
3. [Creating Migrations](#creating-migrations)
4. [Defining Models](#defining-models)
5. [Defining Relationships](#defining-relationships)
6. [Seeding Data](#seeding-data)
7. [Querying Data](#querying-data)
8. [Advanced Features](#advanced-features)

## Project Setup

### 1. Initialize Your Project

```bash
mkdir my-blog
cd my-blog
npm init -y
npm install guruorm mysql2
npm install --save-dev typescript @types/node ts-node
npx tsc --init
```

### 2. Update `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 3. Create Project Structure

```bash
mkdir -p src/models
mkdir -p src/database/migrations
mkdir -p src/database/seeders
mkdir -p src/config
```

## Database Configuration

### Create Database Configuration File

**`src/config/database.ts`**

```typescript
import { Capsule } from 'guruorm';
import dotenv from 'dotenv';

dotenv.config();

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_DATABASE || 'blog',
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
});

capsule.setAsGlobal();
capsule.bootEloquent();

export default capsule;
```

### Create Environment File

**`.env`**

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=blog
DB_USERNAME=root
DB_PASSWORD=your_password
```

## Creating Migrations

### 1. Users Table Migration

**`src/database/migrations/2024_01_01_000000_create_users_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('users', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.string('email').unique();
      table.string('password');
      table.timestamp('email_verified_at').nullable();
      table.rememberToken();
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('users');
  }
}
```

### 2. Categories Table Migration

**`src/database/migrations/2024_01_01_000001_create_categories_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateCategoriesTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('categories', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.string('slug').unique();
      table.text('description').nullable();
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('categories');
  }
}
```

### 3. Posts Table Migration

**`src/database/migrations/2024_01_01_000002_create_posts_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreatePostsTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('posts', (table: Blueprint) => {
      table.id();
      table.foreignId('user_id').constrained().onDelete('cascade');
      table.foreignId('category_id').constrained().onDelete('cascade');
      table.string('title');
      table.string('slug').unique();
      table.text('excerpt').nullable();
      table.longText('body');
      table.boolean('published').default(false);
      table.timestamp('published_at').nullable();
      table.integer('views').default(0);
      table.timestamps();
      
      // Indexes
      table.index('published');
      table.index('published_at');
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('posts');
  }
}
```

### 4. Tags Table and Pivot Table

**`src/database/migrations/2024_01_01_000003_create_tags_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateTagsTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('tags', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.string('slug').unique();
      table.timestamps();
    });

    // Pivot table for many-to-many relationship
    await Schema.create('post_tag', (table: Blueprint) => {
      table.id();
      table.foreignId('post_id').constrained().onDelete('cascade');
      table.foreignId('tag_id').constrained().onDelete('cascade');
      table.timestamps();
      
      table.unique(['post_id', 'tag_id']);
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('post_tag');
    await Schema.dropIfExists('tags');
  }
}
```

### 5. Comments Table

**`src/database/migrations/2024_01_01_000004_create_comments_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateCommentsTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('comments', (table: Blueprint) => {
      table.id();
      table.foreignId('post_id').constrained().onDelete('cascade');
      table.foreignId('user_id').constrained().onDelete('cascade');
      table.foreignId('parent_id').nullable().constrained('comments').onDelete('cascade');
      table.text('body');
      table.boolean('approved').default(false);
      table.timestamps();
      
      table.index('approved');
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('comments');
  }
}
```

### 6. User Profiles Table

**`src/database/migrations/2024_01_01_000005_create_profiles_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateProfilesTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('profiles', (table: Blueprint) => {
      table.id();
      table.foreignId('user_id').unique().constrained().onDelete('cascade');
      table.string('avatar').nullable();
      table.text('bio').nullable();
      table.string('website').nullable();
      table.string('twitter').nullable();
      table.string('github').nullable();
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('profiles');
  }
}
```

### 7. Post Likes Table

**`src/database/migrations/2024_01_01_000006_create_likes_table.ts`**

```typescript
import { Migration, Schema, Blueprint } from 'guruorm';

export default class CreateLikesTable extends Migration {
  async up(): Promise<void> {
    await Schema.create('likes', (table: Blueprint) => {
      table.id();
      table.foreignId('user_id').constrained().onDelete('cascade');
      table.foreignId('post_id').constrained().onDelete('cascade');
      table.timestamps();
      
      table.unique(['user_id', 'post_id']);
    });
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('likes');
  }
}
```

## Defining Models

> **Note:** GuruORM supports three ways to define model properties: static properties, protected instance properties, or constructor with `this`. In this tutorial, we use **static properties** (the cleanest pattern). For alternatives, see [Eloquent ORM documentation](./eloquent.md#defining-models).

### 1. User Model

**`src/models/User.ts`**

```typescript
import { Model } from 'guruorm';
import Post from './Post';
import Profile from './Profile';
import Comment from './Comment';
import Like from './Like';

export default class User extends Model {
  static table = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden = ['password', 'remember_token'];
  static casts = {
    email_verified_at: 'datetime',
  };

  // Relationships
  posts() {
    return this.hasMany(Post);
  }

  profile() {
    return this.hasOne(Profile);
  }

  comments() {
    return this.hasMany(Comment);
  }

  likes() {
    return this.hasMany(Like);
  }

  likedPosts() {
    return this.belongsToMany(Post, 'likes');
  }
}
```

### 2. Post Model

**`src/models/Post.ts`**

```typescript
import { Model } from 'guruorm';
import User from './User';
import Category from './Category';
import Tag from './Tag';
import Comment from './Comment';
import Like from './Like';

export default class Post extends Model {
  static table = 'posts';
  static fillable = [
    'user_id',
    'category_id',
    'title',
    'slug',
    'excerpt',
    'body',
    'published',
    'published_at',
  ];
  static casts = {
    published: 'boolean',
    published_at: 'datetime',
    views: 'integer',
  };

  // Relationships
  author() {
    return this.belongsTo(User, 'user_id');
  }

  category() {
    return this.belongsTo(Category);
  }

  tags() {
    return this.belongsToMany(Tag, 'post_tag');
  }

  comments() {
    return this.hasMany(Comment);
  }

  likes() {
    return this.hasMany(Like);
  }

  likedBy() {
    return this.belongsToMany(User, 'likes');
  }

  // Scopes
  scopePublished(query) {
    query.where('published', true)
         .whereNotNull('published_at')
         .where('published_at', '<=', new Date());
  }

  scopePopular(query) {
    query.where('views', '>', 100);
  }

  scopeRecent(query) {
    query.orderBy('published_at', 'desc');
  }
}
```

### 3. Category Model

**`src/models/Category.ts`**

```typescript
import { Model } from 'guruorm';
import Post from './Post';

export default class Category extends Model {
  static table = 'categories';
  static fillable = ['name', 'slug', 'description'];

  // Relationships
  posts() {
    return this.hasMany(Post);
  }

  publishedPosts() {
    return this.hasMany(Post).where('published', true);
  }
}
```

### 4. Tag Model

**`src/models/Tag.ts`**

```typescript
import { Model } from 'guruorm';
import Post from './Post';

export default class Tag extends Model {
  static table = 'tags';
  static fillable = ['name', 'slug'];

  // Relationships
  posts() {
    return this.belongsToMany(Post, 'post_tag');
  }
}
```

### 5. Comment Model

**`src/models/Comment.ts`**

```typescript
import { Model } from 'guruorm';
import Post from './Post';
import User from './User';

export default class Comment extends Model {
  static table = 'comments';
  static fillable = ['post_id', 'user_id', 'parent_id', 'body', 'approved'];
  static casts = {
    approved: 'boolean',
  };

  // Relationships
  post() {
    return this.belongsTo(Post);
  }

  author() {
    return this.belongsTo(User, 'user_id');
  }

  parent() {
    return this.belongsTo(Comment, 'parent_id');
  }

  replies() {
    return this.hasMany(Comment, 'parent_id');
  }

  // Scopes
  scopeApproved(query) {
    query.where('approved', true);
  }

  scopeTopLevel(query) {
    query.whereNull('parent_id');
  }
}
```

### 6. Profile Model

**`src/models/Profile.ts`**

```typescript
import { Model } from 'guruorm';
import User from './User';

export default class Profile extends Model {
  static table = 'profiles';
  static fillable = ['user_id', 'avatar', 'bio', 'website', 'twitter', 'github'];

  // Relationships
  user() {
    return this.belongsTo(User);
  }
}
```

### 7. Like Model

**`src/models/Like.ts`**

```typescript
import { Model } from 'guruorm';
import User from './User';
import Post from './Post';

export default class Like extends Model {
  static table = 'likes';
  static fillable = ['user_id', 'post_id'];

  // Relationships
  user() {
    return this.belongsTo(User);
  }

  post() {
    return this.belongsTo(Post);
  }
}
```

## Querying Data

### Basic Queries

```typescript
import './config/database';
import User from './models/User';
import Post from './models/Post';

async function examples() {
  // Get all published posts
  const posts = await Post.published().get();

  // Get recent posts with author and category
  const recentPosts = await Post.published()
    .recent()
    .with(['author', 'category'])
    .limit(10)
    .get();

  // Get posts by category
  const techPosts = await Post.published()
    .whereHas('category', (query) => {
      query.where('slug', 'technology');
    })
    .get();

  // Get a user with all their posts and comments
  const user = await User.with(['posts', 'comments', 'profile']).find(1);

  // Get post with nested relationships
  const post = await Post.with([
    'author.profile',
    'category',
    'tags',
    'comments.author',
    'likes',
  ]).find(1);
}
```

### Advanced Queries

```typescript
// Get popular posts with comment count
const popularPosts = await Post.published()
  .withCount('comments')
  .where('views', '>', 100)
  .orderBy('views', 'desc')
  .limit(10)
  .get();

// Get users who liked a specific post
const post = await Post.find(1);
const likers = await post.likedBy().with('profile').get();

// Get posts with specific tags
const posts = await Post.published()
  .whereHas('tags', (query) => {
    query.whereIn('slug', ['javascript', 'typescript']);
  })
  .get();

// Search posts by title or body
const results = await Post.published()
  .where((query) => {
    query.where('title', 'like', '%search term%')
         .orWhere('body', 'like', '%search term%');
  })
  .get();

// Get top commenters
const topCommenters = await User.withCount('comments')
  .orderBy('comments_count', 'desc')
  .limit(10)
  .get();
```

### Aggregates and Statistics

```typescript
// Get post statistics
const stats = {
  totalPosts: await Post.count(),
  publishedPosts: await Post.published().count(),
  totalViews: await Post.sum('views'),
  averageViews: await Post.avg('views'),
  mostViews: await Post.max('views'),
};

// Get posts per category
const postsByCategory = await Category.withCount('posts').get();

// Get most liked posts
const mostLiked = await Post.withCount('likes')
  .orderBy('likes_count', 'desc')
  .limit(10)
  .get();
```

## Complete Example Application

**`src/index.ts`**

```typescript
import './config/database';
import User from './models/User';
import Post from './models/Post';
import Category from './models/Category';
import Tag from './models/Tag';
import Comment from './models/Comment';

async function createBlogPost() {
  // Create a user
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
  });

  // Create user profile
  await user.profile().create({
    bio: 'Software developer and blogger',
    website: 'https://johndoe.com',
    twitter: '@johndoe',
  });

  // Create category
  const category = await Category.firstOrCreate({
    slug: 'technology',
  }, {
    name: 'Technology',
    description: 'Posts about technology',
  });

  // Create tags
  const jsTag = await Tag.firstOrCreate({ slug: 'javascript' }, { name: 'JavaScript' });
  const tsTag = await Tag.firstOrCreate({ slug: 'typescript' }, { name: 'TypeScript' });

  // Create post
  const post = await user.posts().create({
    category_id: category.id,
    title: 'Getting Started with TypeScript',
    slug: 'getting-started-with-typescript',
    excerpt: 'Learn the basics of TypeScript',
    body: 'TypeScript is a typed superset of JavaScript...',
    published: true,
    published_at: new Date(),
  });

  // Attach tags
  await post.tags().attach([jsTag.id, tsTag.id]);

  // Add comment
  await post.comments().create({
    user_id: user.id,
    body: 'Great article!',
    approved: true,
  });

  // Like the post
  await post.likes().create({
    user_id: user.id,
  });

  return post;
}

async function displayPost(postId: number) {
  const post = await Post.with([
    'author.profile',
    'category',
    'tags',
    'comments.author',
  ]).find(postId);

  if (!post) {
    console.log('Post not found');
    return;
  }

  console.log(`
Title: ${post.title}
Author: ${post.author.name}
Category: ${post.category.name}
Tags: ${post.tags.map(t => t.name).join(', ')}
Views: ${post.views}
Comments: ${post.comments.length}
  `);

  // Increment views
  await post.increment('views');
}

async function main() {
  try {
    const post = await createBlogPost();
    await displayPost(post.id);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## Best Practices

### 1. Use Query Scopes for Reusable Queries

```typescript
// Instead of repeating this:
const posts = await Post.where('published', true)
  .whereNotNull('published_at')
  .where('published_at', '<=', new Date())
  .get();

// Define a scope:
scopePublished(query) {
  query.where('published', true)
       .whereNotNull('published_at')
       .where('published_at', '<=', new Date());
}

// Use it:
const posts = await Post.published().get();
```

### 2. Use Eager Loading to Avoid N+1 Queries

```typescript
// Bad: N+1 queries
const posts = await Post.all();
for (const post of posts) {
  console.log(post.author.name); // Queries for each post
}

// Good: Eager loading
const posts = await Post.with('author').get();
for (const post of posts) {
  console.log(post.author.name); // No additional queries
}
```

### 3. Use Transactions for Related Operations

```typescript
import { DB } from 'guruorm';

await DB.transaction(async () => {
  const user = await User.create({ /* ... */ });
  await user.profile().create({ /* ... */ });
  await user.posts().create({ /* ... */ });
});
```

### 4. Use Fillable/Guarded for Mass Assignment Protection

```typescript
class User extends Model {
  // Whitelist approach
  protected fillable = ['name', 'email', 'password'];
  
  // OR Blacklist approach
  protected guarded = ['id', 'is_admin'];
}
```

## Conclusion

You now have a complete blog application built with GuruORM! This tutorial covered:

- ✅ Setting up a GuruORM project
- ✅ Creating migrations for complex table structures
- ✅ Defining models with relationships
- ✅ Querying data efficiently
- ✅ Working with various relationship types
- ✅ Using scopes and advanced queries
- ✅ Following best practices

### Next Steps

- Add authentication and authorization
- Implement API endpoints
- Add caching for performance
- Write tests for your models
- Deploy to production

For more details, check out the [complete documentation](../README.md).
