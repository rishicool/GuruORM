# guruORM

> A powerful, elegant Node.js ORM inspired by Laravel's Illuminate Database

[![npm version](https://badge.fury.io/js/guruorm.svg)](https://www.npmjs.com/package/guruorm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Features

- 🚀 **Fluent Query Builder** - Elegant and expressive query building
- 🔥 **Eloquent ORM** - Active Record implementation for Node.js
- 🗃️ **Multiple Databases** - MySQL, PostgreSQL, SQLite, SQL Server support
- 🔄 **Migrations** - Version control for your database schema
- 🌱 **Seeding** - Populate your database with test data
- 🔗 **Relationships** - Full relationship support (One-to-One, One-to-Many, Many-to-Many, Polymorphic)
- 📦 **TypeScript** - First-class TypeScript support with full type safety
- 🛠️ **CLI Tools** - Powerful command-line interface
- 🎯 **Laravel-like API** - Familiar API for Laravel developers

## 🙏 Acknowledgment

This project is inspired by the excellent [Laravel Illuminate Database](https://github.com/illuminate/database) package. We are grateful to the Laravel team and Taylor Otwell for creating such an elegant and powerful database toolkit that has influenced countless developers worldwide. guruORM aims to bring that same level of elegance and developer experience to the Node.js ecosystem.

## 📦 Installation

```bash
npm install guruorm
```

## 🚀 Quick Start

### Installation

```bash
npm install guruorm
```

### 30-Second Setup

```typescript
import { Capsule } from 'guruorm';

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
```

### Your First Query

```typescript
import { DB } from 'guruorm';

// Simple query
const users = await DB.table('users').where('active', true).get();

// Query builder with joins
const results = await DB.table('users')
  .select('users.*', 'contacts.phone')
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .where('users.active', true)
  .orderBy('name')
  .get();
```

### Your First Model

```typescript
import { Model } from 'guruorm';

class User extends Model {
  protected table = 'users';
  protected fillable = ['name', 'email', 'password'];
  
  // Define relationship
  posts() {
    return this.hasMany(Post);
  }
}

// Use it
const user = await User.find(1);
const users = await User.where('active', true).get();
const newUser = await User.create({ 
  name: 'John Doe', 
  email: 'john@example.com' 
});
```

For a complete guide, see our **[Getting Started Documentation](docs/getting-started.md)**.

---

```typescript
import { Capsule } from 'guruorm';

const capsule = new Capsule();

capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  username: 'root',
  password: 'password',
  charset: 'utf8mb4',
});

// Set as global
capsule.setAsGlobal();

// Boot Eloquent ORM
capsule.bootEloquent();
```

### Query Builder

```typescript
import { DB } from 'guruorm';

// Select users with votes > 100
const users = await DB.table('users')
  .where('votes', '>', 100)
  .get();

// Complex query with joins
const results = await DB.table('users')
  .select('users.*', 'contacts.phone')
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .where('users.active', true)
  .orderBy('name', 'desc')
  .limit(10)
  .get();

// Aggregates
const count = await DB.table('users').count();
const max = await DB.table('users').max('votes');

// Pagination
const users = await DB.table('users').paginate(15);
```

### Schema Builder

```typescript
import { Schema } from 'guruorm';

// Create table
await Schema.create('users', (table) => {
  table.id();
  table.string('name');
  table.string('email').unique();
  table.timestamp('email_verified_at').nullable();
  table.string('password');
  table.timestamps();
});

// Modify table
await Schema.table('users', (table) => {
  table.string('avatar').nullable();
  table.index('email');
});

// Drop table
await Schema.dropIfExists('users');
```

### Eloquent Models

```typescript
import { Model } from 'guruorm';

class User extends Model {
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

  profile() {
    return this.hasOne(Profile);
  }

  roles() {
    return this.belongsToMany(Role, 'role_user');
  }
}

// Usage
const user = await User.find(1);
const users = await User.where('active', true).get();

const newUser = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashed_password',
});

await user.update({ name: 'Jane Doe' });
await user.delete();

// With relationships
const user = await User.with(['posts', 'profile']).find(1);
const posts = await user.posts().where('published', true).get();
```

### Migrations

```typescript
// database/migrations/2024_01_01_000000_create_users_table.ts
import { Migration, Schema } from 'guruorm';

export default class CreateUsersTable extends Migration {
  async up() {
    await Schema.create('users', (table) => {
      table.id();
      table.string('name');
      table.string('email').unique();
      table.string('password');
      table.timestamps();
    });
  }

  async down() {
    await Schema.dropIfExists('users');
  }
}
```

### Seeders

```typescript
// database/seeders/UserSeeder.ts
import { Seeder } from 'guruorm';
import { User } from '../models/User';

export default class UserSeeder extends Seeder {
  async run() {
    // Create specific user
    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashed_password',
    });

    // Using factory
    await User.factory().count(50).create();
  }
}
```

## 🔧 CLI Commands

```bash
# Initialize guruORM
npx guruorm init

# Migrations
npx guruorm migrate
npx guruorm migrate:rollback
npx guruorm migrate:fresh
npx guruorm migrate:refresh
npx guruorm migrate:reset
npx guruorm migrate:status

# Create migration
npx guruorm make:migration create_users_table
npx guruorm make:migration add_avatar_to_users --table=users

# Seeding
npx guruorm db:seed
npx guruorm db:seed --class=UserSeeder

# Create seeder
npx guruorm make:seeder UserSeeder

# Schema
npx guruorm schema:dump
npx guruorm db:show
```

## 📖 Documentation

GuruORM provides comprehensive, easy-to-follow documentation inspired by Laravel's excellent documentation style.

### Core Concepts

- **[Getting Started](docs/getting-started.md)** - Installation, setup, and basic configuration
- **[Query Builder](docs/query-builder.md)** - Build complex database queries with a fluent, expressive API
- **[Eloquent ORM](docs/eloquent.md)** - Work with your database using elegant Active Record models
- **[Relationships](docs/relationships.md)** - Define and query model relationships (One-to-One, One-to-Many, Many-to-Many)
- **[Migrations](docs/migrations.md)** - Version control for your database schema
- **[Seeding](docs/seeding.md)** - Populate your database with test data *(Coming Soon)*

### Additional Topics

- **Collections** - Work with collections of data *(Coming Soon)*
- **Events & Observers** - Hook into model lifecycle events *(Coming Soon)*
- **Mutators & Casting** - Transform model attributes *(Coming Soon)*
- **Advanced Queries** - Subqueries, unions, and raw expressions *(Coming Soon)*
- **Testing** - Test your database interactions *(Coming Soon)*

## 🌟 Why guruORM?

If you love Laravel's database layer and want the same experience in Node.js, guruORM is for you:

- ✅ **Familiar API** - If you know Laravel, you already know guruORM
- ✅ **Type Safety** - Full TypeScript support with intelligent autocompletion
- ✅ **Battle-Tested Patterns** - Based on Laravel's proven architecture
- ✅ **Production Ready** - Comprehensive testing and error handling
- ✅ **Great DX** - Clear error messages, helpful documentation, powerful CLI

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📝 License

guruORM is open-sourced software licensed under the [MIT license](LICENSE).

## 🔗 Links

- [Documentation](https://guruorm.dev/docs)
- [GitHub Repository](https://github.com/rishicool/guruorm)
- [npm Package](https://www.npmjs.com/package/guruorm)
- [Issue Tracker](https://github.com/rishicool/guruorm/issues)

## 💖 Special Thanks

- [Laravel](https://laravel.com) and the Illuminate Database package
- [Taylor Otwell](https://github.com/taylorotwell) for creating Laravel
- All contributors to the Laravel ecosystem

---

Made with ❤️ by the guruORM team
