/**
 * GuruORM JavaScript Example
 * 
 * This example shows how to use GuruORM in a plain JavaScript project
 * No TypeScript compilation required!
 */

const { Capsule, Model, DB } = require('guruorm');

// ==========================================
// 1. Setup Database Connection
// ==========================================

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  username: 'root',
  password: 'password',
});

capsule.setAsGlobal();
capsule.bootEloquent();

// ==========================================
// 2. Define Models (Plain JavaScript)
// ==========================================

class User extends Model {
  constructor() {
    super();
    this.table = 'users';
    this.fillable = ['name', 'email', 'password'];
    this.hidden = ['password'];
  }

  // Define relationships
  posts() {
    return this.hasMany(Post);
  }

  profile() {
    return this.hasOne(Profile);
  }
}

class Post extends Model {
  constructor() {
    super();
    this.table = 'posts';
    this.fillable = ['title', 'body', 'user_id'];
  }

  user() {
    return this.belongsTo(User);
  }

  comments() {
    return this.hasMany(Comment);
  }
}

class Profile extends Model {
  constructor() {
    super();
    this.table = 'profiles';
    this.fillable = ['bio', 'avatar', 'user_id'];
  }

  user() {
    return this.belongsTo(User);
  }
}

class Comment extends Model {
  constructor() {
    super();
    this.table = 'comments';
    this.fillable = ['body', 'post_id', 'user_id'];
  }

  post() {
    return this.belongsTo(Post);
  }

  user() {
    return this.belongsTo(User);
  }
}

// ==========================================
// 3. Query Builder Examples
// ==========================================

async function queryBuilderExamples() {
  console.log('=== Query Builder Examples ===\n');

  // Simple select
  const users = await DB.table('users').get();
  console.log('All users:', users);

  // Where clause
  const activeUsers = await DB.table('users')
    .where('active', true)
    .where('verified', true)
    .get();
  console.log('Active users:', activeUsers);

  // Joins
  const usersWithPosts = await DB.table('users')
    .join('posts', 'users.id', '=', 'posts.user_id')
    .select('users.name', 'posts.title')
    .get();
  console.log('Users with posts:', usersWithPosts);

  // Aggregates
  const userCount = await DB.table('users').count();
  console.log('Total users:', userCount);

  // Grouping
  const postsByUser = await DB.table('posts')
    .select('user_id', DB.raw('COUNT(*) as post_count'))
    .groupBy('user_id')
    .get();
  console.log('Posts by user:', postsByUser);
}

// ==========================================
// 4. Eloquent Model Examples
// ==========================================

async function eloquentExamples() {
  console.log('\n=== Eloquent Model Examples ===\n');

  // Create
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123'
  });
  console.log('Created user:', user);

  // Find
  const foundUser = await User.find(1);
  console.log('Found user:', foundUser);

  // Update
  foundUser.name = 'Jane Doe';
  await foundUser.save();
  console.log('Updated user:', foundUser);

  // Query with where
  const activeUsers = await User.where('active', true)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();
  console.log('Active users:', activeUsers);

  // First or create
  const [user2, created] = await User.firstOrCreate(
    { email: 'admin@example.com' },
    { name: 'Admin', password: 'admin123' }
  );
  console.log('User:', user2, 'Created:', created);
}

// ==========================================
// 5. Relationship Examples
// ==========================================

async function relationshipExamples() {
  console.log('\n=== Relationship Examples ===\n');

  // Eager loading
  const usersWithPosts = await User.with('posts').get();
  console.log('Users with posts:', usersWithPosts);

  // Nested eager loading
  const usersWithPostsAndComments = await User.with(['posts', 'posts.comments']).get();
  console.log('Users with nested relations:', usersWithPostsAndComments);

  // Lazy loading
  const user = await User.find(1);
  const posts = await user.posts().get();
  console.log('User posts:', posts);

  // Has relationship query
  const usersWithPosts2 = await User.has('posts').get();
  console.log('Users that have posts:', usersWithPosts2);

  // Where has
  const usersWithPopularPosts = await User.whereHas('posts', (query) => {
    query.where('views', '>', 1000);
  }).get();
  console.log('Users with popular posts:', usersWithPopularPosts);
}

// ==========================================
// 6. Advanced Features
// ==========================================

async function advancedExamples() {
  console.log('\n=== Advanced Examples ===\n');

  // Chunk processing
  await User.chunk(100, (users) => {
    console.log('Processing chunk of', users.length, 'users');
    // Process each chunk
  });

  // Transactions
  await DB.transaction(async () => {
    const user = await User.create({ name: 'Test', email: 'test@test.com' });
    await Post.create({ title: 'Test Post', user_id: user.id });
    // Both operations committed together
  });

  // Soft deletes (if using SoftDeleteModel)
  // const user = await User.find(1);
  // await user.delete(); // Soft delete
  // const trashedUsers = await User.onlyTrashed().get();
  // await user.restore(); // Restore

  // Scopes
  // Define scope in model first:
  // scopeActive(query) { return query.where('active', true); }
  // const activeUsers = await User.active().get();

  // Query without timestamps
  await Model.withoutTimestamps(async () => {
    const user = await User.find(1);
    user.name = 'Updated Name';
    await user.save(); // Timestamps won't be updated
  });
}

// ==========================================
// 7. Run All Examples
// ==========================================

async function main() {
  try {
    await queryBuilderExamples();
    await eloquentExamples();
    await relationshipExamples();
    await advancedExamples();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the examples
main();
