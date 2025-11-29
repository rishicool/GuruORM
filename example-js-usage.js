// Pure JavaScript Example - No TypeScript Required!
const { Capsule, Model } = require('guruorm');

// Setup database
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

// Define Model in Plain JavaScript
class User extends Model {
  constructor() {
    super();
    this.table = 'users';
    this.fillable = ['name', 'email', 'password'];
  }

  // Relationships
  posts() {
    return this.hasMany(Post);
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
}

// Use the models
async function main() {
  // Create user
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123'
  });

  // Query with where
  const activeUsers = await User.where('active', true)
    .orderBy('name')
    .get();

  // With relationships
  const usersWithPosts = await User.with('posts')
    .where('verified', true)
    .get();

  // Query builder
  const { DB } = require('guruorm');
  
  const results = await DB.table('users')
    .join('posts', 'users.id', '=', 'posts.user_id')
    .select('users.name', 'posts.title')
    .where('users.active', true)
    .get();

  console.log('Users:', results);
}

main().catch(console.error);
