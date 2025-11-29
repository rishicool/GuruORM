# Quick Start Guide - guruORM

This guide will help you get started with guruORM in just a few minutes.

## Installation

```bash
npm install guruorm
```

## Step 1: Setup Database Connection

Create a file `database.ts` or `database.js`:

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_DATABASE || 'myapp',
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
});

capsule.setAsGlobal();
capsule.bootEloquent();

export default capsule;
```

## Step 2: Create Environment File

Create `.env` file:

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=root
DB_PASSWORD=
```

## Step 3: Use Query Builder

```typescript
import './database'; // Initialize connection
import { Capsule } from 'guruorm';

async function queryExample() {
  // Get all users
  const users = await Capsule.table('users').get();
  console.log(users);

  // Get users with condition
  const activeUsers = await Capsule.table('users')
    .where('active', true)
    .get();

  // Get first user
  const firstUser = await Capsule.table('users').first();

  // Insert
  await Capsule.table('users').insert({
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Update
  await Capsule.table('users')
    .where('id', 1)
    .update({ name: 'Jane Doe' });

  // Delete
  await Capsule.table('users')
    .where('id', 1)
    .delete();
}

queryExample();
```

## Step 4: Define Models (Coming in Phase 5)

```typescript
import { Model } from 'guruorm';

export class User extends Model {
  protected table = 'users';
  protected fillable = ['name', 'email', 'password'];
  protected hidden = ['password'];
  protected casts = {
    email_verified_at: 'datetime',
    is_admin: 'boolean',
  };

  // Define relationships
  posts() {
    return this.hasMany(Post);
  }
}

// Usage (once fully implemented)
const user = await User.find(1);
const users = await User.where('active', true).get();
const newUser = await User.create({
  name: 'John',
  email: 'john@example.com',
});
```

## Step 5: Create Schema (Coming in Phase 3)

```typescript
import { Schema } from 'guruorm';

// Create table
await Schema.create('users', (table) => {
  table.id();
  table.string('name');
  table.string('email').unique();
  table.string('password');
  table.boolean('active').default(true);
  table.timestamps();
});
```

## Available Now

✅ Database connection management  
✅ Basic Query Builder (select, where, insert, update, delete)  
✅ Aggregates (count, sum, avg, min, max)  
✅ Order by, limit, offset  
✅ Transactions  
✅ MySQL support  

## Coming Soon

🚧 Complete Query Builder (joins, unions, subqueries)  
🚧 Schema Builder & Migrations  
🚧 Eloquent ORM  
🚧 Relationships  
🚧 Model Factories & Seeding  
🚧 PostgreSQL, SQLite, SQL Server support  
🚧 CLI Commands  

## Need Help?

- [Documentation](./docs/getting-started.md)
- [GitHub Issues](https://github.com/rishicool/guruorm/issues)
- [Examples](./examples/)

## What's Next?

Read the full documentation to learn about:
- [Query Builder](./docs/query-builder.md)
- [Schema Builder](./docs/schema-builder.md)
- [Eloquent Models](./docs/eloquent.md)
- [Migrations](./docs/migrations.md)
