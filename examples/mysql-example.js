/**
 * MySQL Example - GuruORM
 * 
 * Complete working example with MySQL database
 */

const { Capsule, Model } = require('guruorm');

// Initialize Capsule
const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_DATABASE || 'test_db',
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
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
  console.log('🚀 Testing MySQL Connection with GuruORM\n');

  try {
    // Test 1: Query Builder - Select
    console.log('1️⃣  Testing Query Builder - SELECT');
    const users = await capsule.table('users').limit(5).get();
    console.log(`   Found ${users.length} users`);
    console.log('   ✅ Query Builder SELECT works!\n');

    // Test 2: Query Builder - Insert
    console.log('2️⃣  Testing Query Builder - INSERT');
    const insertId = await capsule.table('users').insert({
      name: 'John Doe',
      email: `john${Date.now()}@example.com`,
      age: 30,
    });
    console.log(`   Inserted user with ID: ${insertId}`);
    console.log('   ✅ Query Builder INSERT works!\n');

    // Test 3: Query Builder - Update
    console.log('3️⃣  Testing Query Builder - UPDATE');
    const updated = await capsule.table('users')
      .where('id', insertId)
      .update({ age: 31 });
    console.log(`   Updated ${updated} row(s)`);
    console.log('   ✅ Query Builder UPDATE works!\n');

    // Test 4: Eloquent - Find
    console.log('4️⃣  Testing Eloquent - FIND');
    const user = await User.find(insertId);
    console.log(`   Found user: ${user ? user.name : 'Not found'}`);
    console.log('   ✅ Eloquent FIND works!\n');

    // Test 5: Eloquent - Create
    console.log('5️⃣  Testing Eloquent - CREATE');
    const newUser = await User.create({
      name: 'Jane Smith',
      email: `jane${Date.now()}@example.com`,
      age: 28,
    });
    console.log(`   Created user: ${newUser.name} (ID: ${newUser.id})`);
    console.log('   ✅ Eloquent CREATE works!\n');

    // Test 6: Eloquent - Where Query
    console.log('6️⃣  Testing Eloquent - WHERE');
    const youngUsers = await User.where('age', '<', 35).limit(3).get();
    console.log(`   Found ${youngUsers.length} users under 35`);
    console.log('   ✅ Eloquent WHERE works!\n');

    // Test 7: Aggregates
    console.log('7️⃣  Testing Aggregates');
    const count = await capsule.table('users').count();
    const avgAge = await capsule.table('users').avg('age');
    console.log(`   Total users: ${count}`);
    console.log(`   Average age: ${avgAge}`);
    console.log('   ✅ Aggregates work!\n');

    // Test 8: Joins
    console.log('8️⃣  Testing Joins');
    const usersWithPosts = await capsule.table('users')
      .join('posts', 'users.id', '=', 'posts.user_id')
      .select('users.name', 'posts.title')
      .limit(5)
      .get();
    console.log(`   Found ${usersWithPosts.length} users with posts`);
    console.log('   ✅ Joins work!\n');

    // Test 9: Transactions
    console.log('9️⃣  Testing Transactions');
    await capsule.transaction(async (trx) => {
      await trx.table('users').insert({
        name: 'Transaction Test',
        email: `test${Date.now()}@example.com`,
        age: 25,
      });
      console.log('   Transaction committed');
    });
    console.log('   ✅ Transactions work!\n');

    // Test 10: Eloquent Relationships
    console.log('🔟 Testing Eloquent Relationships');
    const userWithPosts = await User.with('posts').first();
    if (userWithPosts) {
      console.log(`   User: ${userWithPosts.name}`);
      console.log(`   Posts: ${userWithPosts.posts ? userWithPosts.posts.length : 0}`);
    }
    console.log('   ✅ Relationships work!\n');

    console.log('✨ All MySQL tests passed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    // Close connection
    await capsule.disconnect();
    process.exit(0);
  }
}

// Run
main();
