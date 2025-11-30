import { DB } from '../../src';

export default class UserseederSeeder {
  async run() {
    // Using raw SQL queries
    await DB.insert('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Admin User',
      'admin@example.com'
    ]);

    // Or using query builder
    await DB.table('users').insert({
      name: 'Test User',
      email: 'test@example.com'
    });

    // Or using Eloquent models (if you have them)
    // const User = require('../../models/User').default;
    // await User.create({
    //   name: 'Admin',
    //   email: 'admin@example.com',
    // });
  }
}
