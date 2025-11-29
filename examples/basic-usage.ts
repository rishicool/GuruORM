import { Capsule, Model } from '../src';

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

// Define a model
class User extends Model {
  protected table = 'users';
  protected fillable = ['name', 'email', 'password'];
  protected hidden = ['password'];
}

// Example usage
async function main() {
  try {
    // Query builder examples
    const users = await Capsule.table('users')
      .where('active', true)
      .get();

    console.log('Active users:', users);

    // More examples will work once features are fully implemented

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
