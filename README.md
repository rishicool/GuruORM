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

**👉 [See Complete Getting Started Guide](docs/getting-started.md)**

---

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

---

## 💡 Examples

### Query Builder Examples

```typescript
// Basic where clauses
const users = await DB.table('users')
  .where('votes', '>', 100)
  .orWhere('name', 'John')
  .get();

// Joins
const users = await DB.table('users')
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .select('users.*', 'contacts.phone')
  .get();

// Aggregates
const count = await DB.table('users').count();
const max = await DB.table('users').max('votes');

// Chunking results for large datasets
await DB.table('users').chunk(100, async (users) => {
  for (const user of users) {
    // Process user
  }
});
```

### Eloquent Model Examples

```typescript
// Define models
class User extends Model {
  protected fillable = ['name', 'email'];
  
  posts() {
    return this.hasMany(Post);
  }
  
  roles() {
    return this.belongsToMany(Role);
  }
}

// Basic CRUD
const user = await User.create({ name: 'John', email: 'john@example.com' });
const user = await User.find(1);
await user.update({ name: 'Jane' });
await user.delete();

// Query scopes
const popularUsers = await User.where('votes', '>', 100)
  .orderBy('name')
  .get();

// Eager loading relationships
const users = await User.with(['posts', 'roles']).get();

// Querying relationships
const userPosts = await user.posts()
  .where('published', true)
  .orderBy('created_at', 'desc')
  .get();
```

### Migration Examples

```typescript
// Create table
await Schema.create('flights', (table) => {
  table.id();
  table.string('name');
  table.string('airline');
  table.timestamps();
});

// Modify table
await Schema.table('users', (table) => {
  table.string('avatar').nullable();
  table.index('email');
});

// Foreign keys
await Schema.create('posts', (table) => {
  table.id();
  table.foreignId('user_id').constrained().onDelete('cascade');
  table.string('title');
  table.text('body');
  table.timestamps();
});
```

---

## 🔧 CLI Commands

```bash
# Migrations
npx guruorm migrate
npx guruorm migrate:rollback
npx guruorm migrate:fresh
npx guruorm migrate:status

# Create migration
npx guruorm make:migration create_users_table

# Seeding
npx guruorm db:seed
npx guruorm make:seeder UserSeeder
```

---

## 🌟 Why guruORM?

If you love Laravel's database layer and want the same experience in Node.js, guruORM is for you:

- ✅ **Familiar API** - If you know Laravel, you already know guruORM
- ✅ **Type Safety** - Full TypeScript support with intelligent autocompletion
- ✅ **Battle-Tested Patterns** - Based on Laravel's proven architecture
- ✅ **Production Ready** - Comprehensive testing and error handling
- ✅ **Great DX** - Clear error messages, helpful documentation, powerful CLI

### Coming from Laravel?

You'll feel right at home. Here's a comparison:

**Laravel (PHP)**
```php
$users = User::where('active', true)
    ->with('posts')
    ->orderBy('name')
    ->get();
```

**GuruORM (Node.js)**
```typescript
const users = await User.where('active', true)
    .with('posts')
    .orderBy('name')
    .get();
```

Almost identical! The main difference is adding `await` for async operations.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📝 License

guruORM is open-sourced software licensed under the [MIT license](LICENSE).

## 🔗 Links

- [Documentation](docs/getting-started.md)
- [GitHub Repository](https://github.com/rishicool/guruorm)
- [npm Package](https://www.npmjs.com/package/guruorm)
- [Issue Tracker](https://github.com/rishicool/guruorm/issues)

## 💖 Special Thanks

- [Laravel](https://laravel.com) and the Illuminate Database package
- [Taylor Otwell](https://github.com/taylorotwell) for creating Laravel
- All contributors to the Laravel ecosystem

---

Made with ❤️ by the guruORM team
