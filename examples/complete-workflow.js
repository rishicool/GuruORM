/**
 * Complete GuruORM Workflow Example
 * 
 * This example demonstrates:
 * 1. Database setup with Capsule
 * 2. Schema creation with Schema.create()
 * 3. Raw queries with DB.select(), DB.insert(), etc.
 * 4. Query Builder usage
 * 5. Eloquent Models with relationships
 */

const { Capsule, Schema, DB, Model } = require('../dist');

// Setup database connection
const capsule = new Capsule();

capsule.addConnection({
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'guruorm_test',
  username: 'postgres',
  password: 'password',
});

capsule.setAsGlobal();
capsule.bootEloquent();

// Define Models
class User extends Model {
  constructor() {
    super();
    this.table = 'users';
    this.fillable = ['name', 'email'];
  }

  posts() {
    return this.hasMany(Post);
  }
}

class Post extends Model {
  constructor() {
    super();
    this.table = 'posts';
    this.fillable = ['user_id', 'title', 'content'];
  }

  author() {
    return this.belongsTo(User, 'user_id');
  }
}

async function main() {
  try {
    console.log('🚀 GuruORM Complete Workflow Demo\n');

    // ===== 1. Schema Creation =====
    console.log('📋 Creating database schema...');
    
    await Schema.dropIfExists('posts');
    await Schema.dropIfExists('users');

    await Schema.create('users', (table) => {
      table.id();
      table.string('name');
      table.string('email').unique();
      table.timestamps();
    });

    await Schema.create('posts', (table) => {
      table.id();
      table.integer('user_id').unsigned();
      table.string('title');
      table.text('content');
      table.timestamps();
      
      // Foreign key
      table.foreign('user_id').references('id').on('users');
    });

    console.log('✅ Schema created successfully\n');

    // ===== 2. Raw SQL Queries =====
    console.log('📝 Inserting data with raw SQL...');

    await DB.insert(
      'INSERT INTO users (name, email, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['John Doe', 'john@example.com', new Date(), new Date()]
    );

    await DB.insert(
      'INSERT INTO users (name, email, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['Jane Smith', 'jane@example.com', new Date(), new Date()]
    );

    const rawUsers = await DB.select('SELECT * FROM users');
    console.log(`✅ Inserted ${rawUsers.length} users with raw SQL\n`);

    // ===== 3. Query Builder =====
    console.log('🔍 Using Query Builder...');

    await DB.table('posts').insert({
      user_id: 1,
      title: 'First Post',
      content: 'Hello from Query Builder!',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await DB.table('posts').insert({
      user_id: 1,
      title: 'Second Post',
      content: 'Another post using Query Builder',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await DB.table('posts').insert({
      user_id: 2,
      title: 'Jane\'s Post',
      content: 'Post by Jane',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Complex query with join
    const postsWithAuthors = await DB.table('posts')
      .select('posts.*', 'users.name as author_name')
      .join('users', 'posts.user_id', '=', 'users.id')
      .where('users.name', 'John Doe')
      .orderBy('posts.created_at', 'desc')
      .get();

    console.log(`✅ Found ${postsWithAuthors.length} posts by John Doe`);
    console.log('Posts:', postsWithAuthors.map(p => p.title));
    console.log('');

    // ===== 4. Eloquent ORM =====
    console.log('✨ Using Eloquent Models...');

    // Find user
    const user = await User.find(1);
    console.log(`Found user: ${user.get('name')}`);

    // Create new post using Eloquent
    const newPost = await Post.create({
      user_id: 1,
      title: 'Eloquent Post',
      content: 'Created using Eloquent ORM!',
    });

    console.log(`✅ Created post: ${newPost.get('title')}`);

    // Query with where clauses
    const johnsPosts = await Post.where('user_id', 1).get();
    console.log(`John has ${johnsPosts.length} posts\n`);

    // ===== 5. Relationships =====
    console.log('🔗 Working with Relationships...');

    // Eager loading
    const usersWithPosts = await User.with('posts').get();
    
    for (const u of usersWithPosts) {
      const posts = u.getRelation('posts');
      console.log(`${u.get('name')} has ${posts.length} posts`);
    }

    console.log('');

    // ===== 6. Aggregates =====
    console.log('📊 Using Aggregates...');

    const postCount = await DB.table('posts').count();
    const avgId = await DB.table('posts').avg('id');
    const maxId = await DB.table('posts').max('id');

    console.log(`Total posts: ${postCount}`);
    console.log(`Average ID: ${avgId}`);
    console.log(`Max ID: ${maxId}`);
    console.log('');

    // ===== 7. Transactions =====
    console.log('💼 Using Transactions...');

    await DB.transaction(async () => {
      await DB.table('users').insert({
        name: 'Transaction User',
        email: 'trans@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await DB.table('posts').insert({
        user_id: 3,
        title: 'Transaction Post',
        content: 'Created in a transaction',
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log('✅ Transaction completed successfully');
    });

    console.log('');

    // ===== 8. Updates and Deletes =====
    console.log('🔄 Updates and Deletes...');

    // Update using query builder
    const updated = await DB.table('posts')
      .where('title', 'First Post')
      .update({ title: 'Updated First Post' });

    console.log(`✅ Updated ${updated} posts`);

    // Update using Eloquent
    const post = await Post.find(1);
    post.set('content', 'Updated content via Eloquent');
    await post.save();

    console.log('✅ Updated post via Eloquent');

    // Soft delete (if model uses SoftDeletes)
    // await post.delete();

    console.log('');

    // ===== Summary =====
    console.log('🎉 Complete Workflow Demo Finished!\n');
    console.log('GuruORM supports:');
    console.log('✅ Schema.create() and Schema.table() - Schema management');
    console.log('✅ DB.select/insert/update/delete() - Raw SQL queries');
    console.log('✅ DB.table() - Fluent Query Builder');
    console.log('✅ Model with relationships - Eloquent ORM');
    console.log('✅ Transactions, Aggregates, and more!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await DB.disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run the demo
main();
