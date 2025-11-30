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

## Step 4: Define Models

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

// Usage
const user = await User.find(1);
const users = await User.where('active', true).get();
const newUser = await User.create({
  name: 'John',
  email: 'john@example.com',
});
```

## Step 5: Create Migrations

```bash
# Create migration
npx guruorm make:migration create_users_table --create=users

# Run migrations
npx guruorm migrate
```

## Available Now (v1.12.0 - 94% Complete!)

✅ **Database Connection** - MySQL, PostgreSQL, SQLite, SQL Server  
✅ **Query Builder** - Complete (98%) with joins, unions, subqueries  
✅ **Eloquent ORM** - Complete (97%) with all relationships  
✅ **Relationships** - Complete (97%) with constrained lazy eager loading  
✅ **Schema Builder** - Complete (90%) with migrations  
✅ **Migrations** - Complete (90%) with rollback, fresh, refresh  
✅ **Seeding** - Complete (95%) with factories  
✅ **Events & Observers** - Complete (95%) with model lifecycle hooks  
✅ **CLI Commands** - 14 commands (migrate, seed, make:migration, etc.)  
✅ **Soft Deletes** - Full support  
✅ **Scopes** - Local and global scopes  
✅ **Chunking & Lazy Loading** - Memory-efficient processing  
✅ **Cursor Pagination** - Constant-speed pagination  
✅ **Touch Timestamps** - Update parent timestamps (v1.11.0)  
✅ **Constrained Lazy Loading** - Load relations with query constraints (v1.12.0)  
✅ **JavaScript & TypeScript** - Works with both!  

## Latest Features (v1.12.0)

### Constrained Lazy Eager Loading
```typescript
// Load relations after retrieval with query constraints
const user = await User.find(1);

await user.load({
  posts: query => query.where('published', true).orderBy('created_at', 'desc'),
  comments: query => query.where('approved', true).limit(10)
});
```

### Model Touch & Relationship Touching (v1.11.0)
```typescript
// Update timestamps
await user.touch(); // Updates updated_at

// Touch parent timestamps when child changes
class Comment extends Model {
  protected touches = ['post']; // Updates post.updated_at when comment changes
  
  post() {
    return this.belongsTo(Post);
  }
}
```

### Observer Pattern (v1.10.0)
```typescript
// Group all event listeners in one class
class UserObserver {
  creating(user) {
    console.log('Creating user...');
  }
  
  created(user) {
    console.log('User created!');
  }
  
  updating(user) {
    console.log('Updating user...');
  }
}

User.observe(new UserObserver());
```

## Coming Soon (Next 6%)

🚧 Enhanced Attribute Casts (AsArrayObject, AsCollection, AsEncrypted)  
🚧 Database Testing Assertions (assertDatabaseHas, assertDatabaseMissing)  
🚧 Model Pruning System (Prunable trait, model:prune command)  
🚧 Database Events (QueryExecuted, TransactionCommitted)  
🚧 Connection Resolver & Switching  
🚧 Read/Write Connection Splitting  
🚧 Lateral Joins (PostgreSQL, MySQL 8+)  
🚧 JSON Column Operators (->)  
🚧 Schema Dumping  

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
