import { Capsule, Model } from 'guruorm';

// Setup database connection
const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'test_db',
  username: 'root',
  password: '',
  charset: 'utf8mb4',
});

capsule.setAsGlobal();
capsule.bootEloquent();

/**
 * GuruORM supports 3 ways to define Model properties:
 * 
 * 1. Static properties (cleanest - shown below):
 *    class User extends Model {
 *      static table = 'users';
 *      static fillable = ['name', 'email'];
 *    }
 * 
 * 2. Protected instance properties:
 *    class User extends Model {
 *      protected table = 'users';
 *      protected fillable = ['name', 'email'];
 *    }
 * 
 * 3. Constructor with this:
 *    class User extends Model {
 *      constructor() {
 *        super();
 *        this.table = 'users';
 *        this.fillable = ['name', 'email'];
 *      }
 *    }
 */

// Define a model using static properties (cleanest pattern)
class User extends Model {
  static table = 'users';
  static fillable = ['name', 'email', 'password'];
  static hidden = ['password'];
}

// Example usage
async function main() {
  try {
    // Query builder examples
    const users = await Capsule.table('users')
      .where('active', true)
      .get();

    console.log('Active users:', users);

    // Eloquent ORM examples
    const user = await User.find(1);
    if (user) {
      console.log('Found user:', user.name);
    }

    // Create a new user
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'secret',
    });

    console.log('Created user:', newUser.name);

    // Update a user
    newUser.name = 'Jane Doe';
    await newUser.update();

    console.log('Updated user:', newUser.name);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await capsule.disconnect();
  }
}

main();
