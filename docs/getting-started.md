# Getting Started with guruORM

## Installation

Install guruORM via npm:

```bash
npm install guruorm
```

## Basic Setup

### Using the Capsule Manager

The Capsule Manager allows you to use guruORM outside of a full framework.

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

// Add a connection
capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'myapp',
  username: 'root',
  password: 'password',
  charset: 'utf8mb4',
});

// Make it globally available
capsule.setAsGlobal();

// Boot Eloquent ORM
capsule.bootEloquent();
```

### Configuration Options

```typescript
{
  driver: 'mysql' | 'pgsql' | 'sqlite' | 'sqlserver',
  host: 'localhost',
  port: 3306,
  database: 'database_name',
  username: 'root',
  password: 'password',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  prefix: '',
  pool: {
    min: 2,
    max: 10
  }
}
```

## Query Builder

```typescript
import { DB } from 'guruorm';

// Basic select
const users = await DB.table('users').get();

// Where clause
const activeUsers = await DB.table('users')
  .where('active', true)
  .get();

// Multiple conditions
const results = await DB.table('users')
  .where('votes', '>', 100)
  .orWhere('name', 'John')
  .get();
```

## Schema Builder

```typescript
import { Schema } from 'guruorm';

// Create table
await Schema.create('users', (table) => {
  table.id();
  table.string('name');
  table.string('email').unique();
  table.timestamps();
});

// Drop table
await Schema.dropIfExists('users');
```

## Eloquent Models

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected table = 'users';
  protected fillable = ['name', 'email'];
}

// Create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
});

// Find
const user = await User.find(1);

// Update
await user.update({ name: 'Jane Doe' });

// Delete
await user.delete();
```

## Next Steps

- [Query Builder](./query-builder.md)
- [Schema Builder](./schema-builder.md)
- [Eloquent ORM](./eloquent.md)
- [Migrations](./migrations.md)
- [Relationships](./relationships.md)
