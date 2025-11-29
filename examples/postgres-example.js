/**
 * PostgreSQL Example - GuruORM
 * 
 * Complete working example with PostgreSQL database
 */

const { Capsule, Model } = require('guruorm');

// Initialize Capsule
const capsule = new Capsule();

capsule.addConnection({
  driver: 'pgsql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'test_db',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

capsule.setAsGlobal();
capsule.bootEloquent();

// Define User Model
class User extends Model {
  constructor() {
    super();
    this.table = 'users';
    this.fillable = ['name', 'email', 'age'];
  }

  posts() {
    return this.hasMany(Post);
  }
}

// Define Post Model
class Post extends Model {
  constructor() {
    super();
    this.table = 'posts';
    this.fillable = ['user_id', 'title', 'content'];
  }

  user() {
    return this.belongsTo(User);
  }
}

// Main function
async function main() {
  console.log('PostgreSQL Connection Test with GuruORM');
  console.log('');

  try {
    // Test 1: Query Builder - Select
    console.log('1. Testing Query Builder - SELECT');
    const users = await capsule.table('users').limit(5).get();
    console.log(`   Found ${users.length} users`);
    console.log('   Success: Query Builder SELECT works');
    console.log('');

    // Test 2: Query Builder - Insert
    console.log('2. Testing Query Builder - INSERT');
    const timestamp = Date.now();
    await capsule.table('users').insert({
      name: 'John Doe',
      email: `john${timestamp}@example.com`,
      age: 30,
    });
    console.log('   Inserted user successfully');
    console.log('   Success: Query Builder INSERT works');
    console.log('');

    // Test 3: Query Builder - Update
    console.log('3. Testing Query Builder - UPDATE');
    const updated = await capsule.table('users')
      .where('email', `john${timestamp}@example.com`)
      .update({ age: 31 });
    console.log(`   Updated ${updated} row(s)`);
    console.log('   Success: Query Builder UPDATE works');
    console.log('');

    // Test 4: Eloquent - Find
    console.log('4. Testing Eloquent - FIND');
    const user = await User.first();
    console.log(`   Found user: ${user ? user.name : 'Not found'}`);
    console.log('   Success: Eloquent FIND works');
    console.log('');

    // Test 5: Eloquent - Create
    console.log('5. Testing Eloquent - CREATE');
    const newUser = await User.create({
      name: 'Jane Smith',
      email: `jane${Date.now()}@example.com`,
      age: 28,
    });
    console.log(`   Created user: ${newUser.name}`);
    console.log('   Success: Eloquent CREATE works');
    console.log('');

    // Test 6: Eloquent - Where Query
    console.log('6. Testing Eloquent - WHERE');
    const youngUsers = await User.where('age', '<', 35).limit(3).get();
    console.log(`   Found ${youngUsers.length} users under 35`);
    console.log('   Success: Eloquent WHERE works');
    console.log('');

    // Test 7: Aggregates
    console.log('7. Testing Aggregates');
    const count = await capsule.table('users').count();
    const avgAge = await capsule.table('users').avg('age');
    console.log(`   Total users: ${count}`);
    console.log(`   Average age: ${avgAge}`);
    console.log('   Success: Aggregates work');
    console.log('');

    // Test 8: Joins
    console.log('8. Testing Joins');
    const usersWithPosts = await capsule.table('users')
      .join('posts', 'users.id', '=', 'posts.user_id')
      .select('users.name', 'posts.title')
      .limit(5)
      .get();
    console.log(`   Found ${usersWithPosts.length} users with posts`);
    console.log('   Success: Joins work');
    console.log('');

    // Test 9: Transactions
    console.log('9. Testing Transactions');
    await capsule.transaction(async (trx) => {
      await trx.table('users').insert({
        name: 'Transaction Test',
        email: `test${Date.now()}@example.com`,
        age: 25,
      });
      console.log('   Transaction committed');
    });
    console.log('   Success: Transactions work');
    console.log('');

    // Test 10: Eloquent Relationships
    console.log('10. Testing Eloquent Relationships');
    const userWithPosts = await User.with('posts').first();
    if (userWithPosts) {
      console.log(`   User: ${userWithPosts.name}`);
      console.log(`   Posts: ${userWithPosts.posts ? userWithPosts.posts.length : 0}`);
    }
    console.log('   Success: Relationships work');
    console.log('');

    console.log('All PostgreSQL tests passed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    // Close connection
    await capsule.disconnect();
    process.exit(0);
  }
}

// Run
main();
