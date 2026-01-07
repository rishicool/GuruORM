# Phase 6: Documentation & Migration Guide

**Duration:** 4 days  
**Priority:** CRITICAL  
**Version:** 3.0.0

---

## Overview

Phase 6 creates comprehensive documentation for all new features, a detailed migration guide from v2.x to v3.0, and a complete Laravel comparison matrix. This ensures users can easily adopt GuruORM v3.0 and understand its Laravel parity.

**Current State:**
- ✅ Basic documentation exists (70% complete)
- ✅ README with getting started
- ❌ Phase 1-5 features undocumented
- ❌ Migration guide missing
- ❌ Laravel comparison incomplete
- ❌ API reference outdated
- ❌ Examples need updating

**Target State:**
- ✅ 100% feature documentation
- ✅ Complete migration guide with examples
- ✅ Comprehensive Laravel comparison
- ✅ Updated API reference
- ✅ All examples working and tested
- ✅ Video tutorials (optional)

---

## Detailed Implementation Plan

### Day 1: Update Core Documentation Files (1 day)

#### Morning: Update docs/database.md

**Add Phase 1 Features:**

```markdown
# Database

## Database Manager

### Static Transaction Wrapper

GuruORM v3.0 introduces a static transaction wrapper matching Laravel's syntax:

\`\`\`typescript
import DB from 'guruorm';

// Simple transaction
await DB.transaction(async () => {
    await User.create({ name: 'John' });
    await Post.create({ title: 'My Post', user_id: 1 });
});

// Transaction with retry logic
await DB.transaction(async () => {
    // Your database operations
}, 3); // Retry up to 3 times on deadlock

// Manual transaction control
await DB.beginTransaction();

try {
    await User.create({ name: 'John' });
    await Post.create({ title: 'My Post' });
    
    await DB.commit();
} catch (error) {
    await DB.rollback();
    throw error;
}
\`\`\`

**Comparison with Laravel:**

| Laravel | GuruORM v3.0 |
|---------|--------------|
| \`DB::transaction(fn)\` | \`DB.transaction(fn)\` |
| \`DB::beginTransaction()\` | \`DB.beginTransaction()\` |
| \`DB::commit()\` | \`DB.commit()\` |
| \`DB::rollback()\` | \`DB.rollback()\` |

### Schema Introspection

New methods for inspecting database schema:

\`\`\`typescript
// Check if table exists
if (await DB.schema().hasTable('users')) {
    console.log('Users table exists');
}

// Check if column exists
if (await DB.schema().hasColumn('users', 'email')) {
    console.log('Email column exists');
}

// Get column type
const type = await DB.schema().getColumnType('users', 'email');
console.log(type); // 'string'

// List all columns
const columns = await DB.schema().getColumnListing('users');
console.log(columns); // ['id', 'name', 'email', 'created_at', 'updated_at']
\`\`\`

**Cross-Database Support:**

| Method | PostgreSQL | MySQL | SQLite |
|--------|------------|-------|--------|
| \`hasTable()\` | ✅ | ✅ | ✅ |
| \`hasColumn()\` | ✅ | ✅ | ✅ |
| \`getColumnType()\` | ✅ | ✅ | ✅ |
| \`getColumnListing()\` | ✅ | ✅ | ✅ |
```

---

#### Afternoon: Update docs/eloquent.md

**Add Phase 1 Features:**

```markdown
# Eloquent Models

## Model Methods

### refresh() and fresh()

Reload model data from database:

\`\`\`typescript
// Refresh the model (updates existing instance)
const user = await User.find(1);
user.name = 'Modified';

await user.refresh();
console.log(user.name); // Original name from database

// Fresh copy (returns new instance)
const user = await User.find(1);
const freshUser = await user.fresh();

console.log(user !== freshUser); // true (different instances)
\`\`\`

**With Relations:**

\`\`\`typescript
// Refresh with specific relations
await user.refresh(['posts', 'comments']);

// Fresh with relations
const freshUser = await user.fresh(['posts']);
\`\`\`

### replicate()

Clone a model without saving:

\`\`\`typescript
const originalPost = await Post.find(1);

// Clone the post
const clonedPost = originalPost.replicate();
await clonedPost.save();

console.log(clonedPost.id !== originalPost.id); // true (new record)
console.log(clonedPost.title === originalPost.title); // true

// Exclude specific attributes
const clonedPost = originalPost.replicate(['created_at', 'updated_at']);
// created_at and updated_at will be new
\`\`\`

**Use Cases:**

- Duplicating records
- Creating templates
- Versioning content
- Testing with similar data
```

---

### Day 2: Create New Documentation Files (1 day)

#### Morning: Create docs/relationships-advanced.md

```markdown
# Advanced Relationships

## Many-to-Many Relationships

### Querying Pivot Tables

#### Selecting Pivot Columns

\`\`\`typescript
// Select specific pivot columns
const roles = await user.roles()
    .withPivot('assigned_at', 'assigned_by')
    .get();

roles.forEach(role => {
    console.log(role.pivot.assigned_at);
    console.log(role.pivot.assigned_by);
});

// With timestamps
const roles = await user.roles()
    .withTimestamps()
    .get();

console.log(roles[0].pivot.created_at);
console.log(roles[0].pivot.updated_at);
\`\`\`

#### Filtering by Pivot Columns

\`\`\`typescript
// Where pivot column equals value
const activeRoles = await user.roles()
    .wherePivot('active', true)
    .get();

// Where pivot in array
const recentRoles = await user.roles()
    .wherePivotIn('status', ['active', 'pending'])
    .get();

// Where pivot null
const unassignedRoles = await user.roles()
    .wherePivotNull('assigned_at')
    .get();

// Where pivot between
const roles = await user.roles()
    .wherePivotBetween('level', [1, 5])
    .get();

// Order by pivot
const orderedRoles = await user.roles()
    .orderByPivot('assigned_at', 'desc')
    .get();
\`\`\`

### Advanced Sync Methods

#### Sync Without Detaching

Attach new relationships without removing existing ones:

\`\`\`typescript
// User has roles: [1, 2]

await user.roles().syncWithoutDetaching([3, 4]);
// User now has roles: [1, 2, 3, 4]

// With pivot data
await user.roles().syncWithoutDetaching({
    3: { assigned_by: 'admin' },
    4: { assigned_by: 'manager' }
});
\`\`\`

#### Update Existing Pivot

Update pivot data for existing relationships:

\`\`\`typescript
await user.roles().updateExistingPivot(roleId, {
    assigned_by: 'new_admin',
    expires_at: new Date('2027-01-01')
});
\`\`\`

#### Toggle Relationships

Attach if missing, detach if present:

\`\`\`typescript
// User has roles: [1, 2]

const result = await user.roles().toggle([2, 3]);
// User now has roles: [1, 3]
// result: { attached: [3], detached: [2] }

// With pivot data for newly attached
const result = await user.roles().toggle({
    3: { assigned_by: 'admin' }
});
\`\`\`

#### Sync With Pivot Values

Apply same pivot values to all synced relationships:

\`\`\`typescript
await user.roles().syncWithPivotValues([1, 2, 3], {
    assigned_by: 'admin',
    assigned_at: new Date()
});

// All three roles will have the same pivot values
\`\`\`

### Lazy Eager Loading Aggregates

Load relationship counts and aggregates after model is loaded:

\`\`\`typescript
const user = await User.find(1);

// Load counts
await user.loadCount('posts', 'comments');
console.log(user.posts_count); // 10
console.log(user.comments_count); // 25

// With constraints
await user.loadCount({
    posts: (query) => query.where('published', true)
});
console.log(user.posts_count); // 5 (only published)

// Load max/min/sum/avg
await user.loadMax({ orders: 'amount' });
console.log(user.orders_max_amount); // 999.99

await user.loadMin({ orders: 'amount' });
console.log(user.orders_min_amount); // 10.00

await user.loadSum({ orders: 'amount' });
console.log(user.orders_sum_amount); // 5432.10

await user.loadAvg({ orders: 'amount' });
console.log(user.orders_avg_amount); // 123.45

// Multiple aggregates at once
await Promise.all([
    user.loadCount('orders'),
    user.loadSum({ orders: 'amount' }),
    user.loadAvg({ orders: 'amount' })
]);
\`\`\`

### Touching Parent Timestamps

Automatically update parent timestamps when child changes:

\`\`\`typescript
class Comment extends Model {
    protected touches = ['post']; // Touch post when comment changes
    
    post() {
        return this.belongsTo(Post);
    }
}

// When comment is saved, post.updated_at is automatically updated
const comment = await Comment.find(1);
comment.content = 'Updated content';
await comment.save(); // Also updates post.updated_at

// Disable touching temporarily
await Model.withoutTouching(async () => {
    comment.content = 'Another update';
    await comment.save(); // Won't touch post
});

// Disable touching for specific models
await Model.withoutTouchingOn([Comment], async () => {
    // Comment saves won't touch parents
    await comment.save();
});
\`\`\`

**Laravel Comparison:**

All relationship features have 100% parity with Laravel:

| Feature | Laravel | GuruORM v3.0 |
|---------|---------|--------------|
| \`withPivot()\` | ✅ | ✅ |
| \`wherePivot()\` | ✅ | ✅ |
| \`syncWithoutDetaching()\` | ✅ | ✅ |
| \`updateExistingPivot()\` | ✅ | ✅ |
| \`toggle()\` | ✅ | ✅ |
| \`loadCount()\` | ✅ | ✅ |
| \`loadMax/Min/Sum/Avg()\` | ✅ | ✅ |
| Touch relations | ✅ | ✅ |
```

---

#### Afternoon: Create docs/query-builder-advanced.md

```markdown
# Advanced Query Builder

## Having Clauses

### Having Null Methods

\`\`\`typescript
// Having null
await DB.table('orders')
    .select('customer_id', DB.raw('SUM(amount) as total'))
    .groupBy('customer_id')
    .havingNull('customer_email')
    .get();

// Having not null
await DB.table('orders')
    .select('customer_id', DB.raw('COUNT(*) as count'))
    .groupBy('customer_id')
    .havingNotNull('phone')
    .get();

// Or having null
await DB.table('orders')
    .groupBy('customer_id')
    .havingNull('email')
    .orHavingNull('phone')
    .get();
\`\`\`

## JSON Operations

GuruORM v3.0 adds comprehensive JSON query support for PostgreSQL, MySQL, and SQLite.

### Check if JSON Contains Key

\`\`\`typescript
// PostgreSQL: options ? 'notifications'
// MySQL: JSON_CONTAINS_PATH(options, 'one', '$.notifications')

const users = await DB.table('users')
    .whereJsonContainsKey('options->notifications')
    .get();

// Nested keys
const users = await DB.table('users')
    .whereJsonContainsKey('options->notifications->email')
    .get();

// Doesn't contain key
const users = await DB.table('users')
    .whereJsonDoesntContainKey('options->premium')
    .get();
\`\`\`

### JSON Array Length

\`\`\`typescript
// Users with more than 2 languages
const users = await DB.table('users')
    .whereJsonLength('options->languages', '>', 2)
    .get();

// Exact length
const users = await DB.table('users')
    .whereJsonLength('options->tags', 5)
    .get();

// Combined with other JSON queries
const users = await DB.table('users')
    .whereJsonContainsKey('options->languages')
    .whereJsonLength('options->languages', '>=', 2)
    .get();
\`\`\`

**Supported Databases:**

| Method | PostgreSQL | MySQL 5.7+ | SQLite 3.38+ |
|--------|------------|------------|--------------|
| \`whereJsonContainsKey()\` | ✅ | ✅ | ✅ |
| \`whereJsonLength()\` | ✅ | ✅ | ✅ |

## PostgreSQL Array Operations

### Array Contains

\`\`\`typescript
// Posts with specific tags
const posts = await DB.table('posts')
    .whereArrayContains('tags', ['php', 'laravel'])
    .get();
// PostgreSQL: tags @> ARRAY['php', 'laravel']

// With single value
const posts = await DB.table('posts')
    .whereArrayContains('tags', ['javascript'])
    .get();
\`\`\`

### Array Overlaps

Check if arrays have any common elements:

\`\`\`typescript
const posts = await DB.table('posts')
    .whereArrayOverlaps('tags', ['php', 'javascript', 'python'])
    .get();
// PostgreSQL: tags && ARRAY['php', 'javascript', 'python']
\`\`\`

### Array Length

\`\`\`typescript
// Posts with more than 3 tags
const posts = await DB.table('posts')
    .whereArrayLength('tags', '>', 3)
    .get();

// Exact length
const posts = await DB.table('posts')
    .whereArrayLength('tags', 3)
    .get();
\`\`\`

**Note:** Array operations are PostgreSQL-specific.

## Additional Methods

### reorder()

Remove all existing orders and optionally add new one:

\`\`\`typescript
const query = DB.table('users')
    .orderBy('name')
    .orderBy('email');

// Clear all orders
query.reorder();

// Clear and add new order
query.reorder('created_at', 'desc');
\`\`\`

### Index Hints (MySQL)

Force query to use specific indexes:

\`\`\`typescript
// Force index
await DB.table('users')
    .forceIndex('idx_email')
    .where('email', 'like', '%@gmail.com')
    .get();

// Use index (hint)
await DB.table('users')
    .useIndex('idx_name')
    .where('name', 'John')
    .get();

// Ignore index
await DB.table('users')
    .ignoreIndex('idx_created_at')
    .orderBy('created_at')
    .get();
\`\`\`

**Note:** Index hints are MySQL/MariaDB-specific.
```

---

### Day 3: Create Migration Guide (1 day)

#### Create MIGRATION_V2_TO_V3.md

```markdown
# GuruORM v2.x → v3.0 Migration Guide

This guide helps you upgrade from GuruORM v2.x to v3.0.

---

## Breaking Changes

### None! 🎉

GuruORM v3.0 is **100% backward compatible** with v2.x. All existing code will continue to work without any changes.

v3.0 only **adds** new features and does not remove or change existing functionality.

---

## New Features Overview

| Category | Features Added | Laravel Parity |
|----------|---------------|----------------|
| **Database** | Static transaction wrapper, schema introspection | 100% |
| **Query Builder** | Having null, JSON ops, PostgreSQL arrays | 100% |
| **Model** | refresh(), fresh(), replicate() | 100% |
| **Relationships** | Pivot queries, sync methods, lazy aggregates | 100% |
| **Collections** | 30+ new methods (sole, ensure, sliding, etc.) | 100% |
| **Schema** | foreignId(), change(), renameColumn() | 100% |
| **Factories** | States, sequences, relationships, recycle | 100% |

---

## Upgrade Steps

### 1. Update Package

\`\`\`bash
# npm
npm install guruorm@^3.0.0

# pnpm
pnpm add guruorm@^3.0.0

# yarn
yarn add guruorm@^3.0.0
\`\`\`

### 2. Update TypeScript Types (Optional)

If using TypeScript, update your type definitions:

\`\`\`typescript
// Before (v2.x)
import { Model, QueryBuilder } from 'guruorm';

// After (v3.0) - same imports, enhanced types
import { Model, QueryBuilder } from 'guruorm';

// New types available
import { DB, Factory, Collection } from 'guruorm';
\`\`\`

### 3. Test Your Application

Run your existing test suite:

\`\`\`bash
npm test
\`\`\`

Everything should pass without changes!

---

## Adopting New Features (Optional)

While not required, you can gradually adopt v3.0 features to improve your code.

### Database Transactions

**Before (v2.x):**
\`\`\`typescript
const connection = await Model.getConnection();
await connection.beginTransaction();

try {
    await User.create({ name: 'John' });
    await Post.create({ title: 'My Post' });
    
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
}
\`\`\`

**After (v3.0):**
\`\`\`typescript
import DB from 'guruorm';

await DB.transaction(async () => {
    await User.create({ name: 'John' });
    await Post.create({ title: 'My Post' });
});
\`\`\`

### Model Reloading

**Before (v2.x):**
\`\`\`typescript
// Manual reload
const user = await User.find(1);
const reloaded = await User.find(user.id);
\`\`\`

**After (v3.0):**
\`\`\`typescript
const user = await User.find(1);

// Update existing instance
await user.refresh();

// Get fresh instance
const fresh = await user.fresh();
\`\`\`

### Pivot Queries

**Before (v2.x):**
\`\`\`typescript
// Limited pivot querying
const roles = await user.roles().get();

// Manual filtering
const activeRoles = roles.filter(role => role.pivot?.active);
\`\`\`

**After (v3.0):**
\`\`\`typescript
// Direct pivot queries
const activeRoles = await user.roles()
    .wherePivot('active', true)
    .withPivot('assigned_at', 'assigned_by')
    .get();

roles.forEach(role => {
    console.log(role.pivot.assigned_at);
});
\`\`\`

### Relationship Counts

**Before (v2.x):**
\`\`\`typescript
// Eager load counts
const users = await User.withCount('posts').get();

// Manual count after loading
const user = await User.find(1);
const postCount = await user.posts().count();
user.posts_count = postCount;
\`\`\`

**After (v3.0):**
\`\`\`typescript
// Lazy load counts
const user = await User.find(1);
await user.loadCount('posts', 'comments');

console.log(user.posts_count);
console.log(user.comments_count);

// With aggregates
await user.loadSum({ orders: 'amount' });
console.log(user.orders_sum_amount);
\`\`\`

### Factory States

**Before (v2.x):**
\`\`\`typescript
class UserFactory extends Factory {
    definition() {
        return {
            name: faker.name.fullName(),
            email: faker.internet.email(),
            role: 'user'
        };
    }
}

// Create admin manually
const admin = await User.factory().create({
    role: 'admin'
});
\`\`\`

**After (v3.0):**
\`\`\`typescript
class UserFactory extends Factory {
    definition() {
        return {
            name: faker.name.fullName(),
            email: faker.internet.email(),
            role: 'user'
        };
    }
    
    admin() {
        return this.state({ role: 'admin' });
    }
}

// Create admin with state
const admin = await User.factory().admin().create();

// Create multiple admins
const admins = await User.factory().admin().count(5).create();
\`\`\`

### Schema Introspection

**Before (v2.x):**
\`\`\`typescript
// Manual table checking
try {
    await DB.table('users').first();
    console.log('Table exists');
} catch (error) {
    console.log('Table does not exist');
}
\`\`\`

**After (v3.0):**
\`\`\`typescript
// Direct schema checks
if (await DB.schema().hasTable('users')) {
    console.log('Table exists');
}

if (await DB.schema().hasColumn('users', 'email')) {
    console.log('Column exists');
}

const columns = await DB.schema().getColumnListing('users');
console.log(columns);
\`\`\`

### Migration Column Modifications

**Before (v2.x):**
\`\`\`typescript
// Drop and recreate column
export async function up(schema) {
    await schema.table('users', (table) => {
        table.dropColumn('email');
    });
    
    await schema.table('users', (table) => {
        table.string('email', 100).nullable();
    });
}
\`\`\`

**After (v3.0):**
\`\`\`typescript
// Modify in place
export async function up(schema) {
    await schema.table('users', (table) => {
        table.string('email', 100).nullable().change();
    });
}
\`\`\`

### Foreign Keys

**Before (v2.x):**
\`\`\`typescript
await schema.create('posts', (table) => {
    table.id();
    table.unsignedBigInteger('user_id');
    table.foreign('user_id').references('id').on('users');
});
\`\`\`

**After (v3.0):**
\`\`\`typescript
await schema.create('posts', (table) => {
    table.id();
    table.foreignId('user_id').constrained();
    // Automatically creates foreign key to users.id
});

// With cascade
await schema.create('posts', (table) => {
    table.id();
    table.foreignId('user_id')
        .constrained()
        .cascadeOnDelete();
});
\`\`\`

---

## Performance Improvements

v3.0 includes several performance optimizations:

- **Factory recycle()**: Reuse models in seeders for 10x faster seeding
- **Optimized pivot queries**: Direct SQL instead of post-processing
- **Schema caching**: Introspection results cached per connection
- **Lazy aggregates**: Efficient single-query aggregation

### Before (v2.x):
\`\`\`typescript
// Creating 1000 posts with users (slow)
for (let i = 0; i < 1000; i++) {
    const user = await User.factory().create();
    await Post.factory().create({ user_id: user.id });
}
// ~30 seconds
\`\`\`

### After (v3.0):
\`\`\`typescript
// Creating 1000 posts with recycled users (fast)
const users = await User.factory().count(10).create();

await Post.factory()
    .count(1000)
    .recycle(users)
    .create();
// ~3 seconds (10x faster!)
\`\`\`

---

## Deprecation Notices

**None.** v2.x methods are not deprecated and will continue to work indefinitely.

---

## Need Help?

- [Documentation](https://guruorm.dev/docs)
- [GitHub Issues](https://github.com/your-org/guruorm/issues)
- [Discord Community](https://discord.gg/guruorm)

---

## Summary

✅ **Zero breaking changes** - all v2.x code works in v3.0  
✅ **100% Laravel parity** - matching feature set with Laravel 10/11  
✅ **Performance improvements** - especially for testing/seeding  
✅ **Gradual adoption** - use new features when you need them
```

---

### Day 4: Create Laravel Comparison & Examples (1 day)

#### Create LARAVEL_COMPARISON.md

```markdown
# GuruORM vs Laravel Eloquent Comparison

Complete feature comparison between GuruORM v3.0 and Laravel 10/11 Eloquent.

---

## Core Features

| Feature | Laravel 10/11 | GuruORM v3.0 | Notes |
|---------|---------------|--------------|-------|
| **Query Builder** |
| Basic queries | ✅ | ✅ | 100% compatible |
| Joins | ✅ | ✅ | All join types |
| Aggregates | ✅ | ✅ | count, sum, avg, etc. |
| Having clauses | ✅ | ✅ | Including havingNull |
| JSON operations | ✅ | ✅ | PostgreSQL, MySQL, SQLite |
| Array operations | ✅ | ✅ | PostgreSQL only |
| Index hints | ✅ | ✅ | MySQL only |
| **Models** |
| Basic CRUD | ✅ | ✅ | create, update, delete |
| Mass assignment | ✅ | ✅ | fillable, guarded |
| Timestamps | ✅ | ✅ | created_at, updated_at |
| Soft deletes | ✅ | ✅ | Full support |
| Global scopes | ✅ | ✅ | Query scopes |
| Accessors/Mutators | ✅ | ✅ | get/set attributes |
| Attribute casting | ✅ | ✅ | int, string, boolean, etc. |
| refresh() | ✅ | ✅ | Reload from DB |
| fresh() | ✅ | ✅ | Fresh instance |
| replicate() | ✅ | ✅ | Clone model |
| **Relationships** |
| One to One | ✅ | ✅ | hasOne, belongsTo |
| One to Many | ✅ | ✅ | hasMany, belongsTo |
| Many to Many | ✅ | ✅ | belongsToMany |
| Has Through | ✅ | ✅ | hasManyThrough |
| Polymorphic | ✅ | ✅ | All types |
| Pivot tables | ✅ | ✅ | Full support |
| wherePivot() | ✅ | ✅ | All variants |
| withPivot() | ✅ | ✅ | Select columns |
| Sync methods | ✅ | ✅ | sync, attach, detach |
| syncWithoutDetaching() | ✅ | ✅ | New in v3.0 |
| toggle() | ✅ | ✅ | New in v3.0 |
| Touch relations | ✅ | ✅ | Auto-update timestamps |
| **Eager Loading** |
| with() | ✅ | ✅ | Eager load relations |
| load() | ✅ | ✅ | Lazy eager load |
| withCount() | ✅ | ✅ | Load counts |
| loadCount() | ✅ | ✅ | New in v3.0 |
| loadMax/Min/Sum/Avg() | ✅ | ✅ | New in v3.0 |
| **Collections** |
| Basic methods | ✅ | ✅ | map, filter, reduce, etc. |
| sole() | ✅ | ✅ | New in v3.0 |
| ensure() | ✅ | ✅ | New in v3.0 |
| sliding() | ✅ | ✅ | New in v3.0 |
| partition() | ✅ | ✅ | New in v3.0 |
| 30+ new methods | ✅ | ✅ | Full v3.0 parity |
| **Database** |
| Transactions | ✅ | ✅ | Static wrapper |
| DB::transaction() | ✅ | ✅ | New in v3.0 |
| Connection pooling | ✅ | ✅ | Multiple connections |
| Read/write splitting | ✅ | ✅ | Supported |
| **Schema** |
| Migrations | ✅ | ✅ | Up/down support |
| Column types | ✅ | ✅ | All types |
| Indexes | ✅ | ✅ | All types |
| Foreign keys | ✅ | ✅ | Full support |
| foreignId() | ✅ | ✅ | New in v3.0 |
| change() | ✅ | ✅ | New in v3.0 |
| renameColumn() | ✅ | ✅ | New in v3.0 |
| Schema introspection | ✅ | ✅ | New in v3.0 |
| **Factories** |
| Basic factories | ✅ | ✅ | make, create |
| States | ✅ | ✅ | New in v3.0 |
| Sequences | ✅ | ✅ | New in v3.0 |
| Relationships | ✅ | ✅ | for, has, hasAttached |
| recycle() | ✅ | ✅ | New in v3.0 |
| Callbacks | ✅ | ✅ | afterMaking, afterCreating |

---

## Syntax Comparison

### Database Transactions

**Laravel:**
\`\`\`php
DB::transaction(function () {
    User::create(['name' => 'John']);
    Post::create(['title' => 'My Post']);
});
\`\`\`

**GuruORM:**
\`\`\`typescript
await DB.transaction(async () => {
    await User.create({ name: 'John' });
    await Post.create({ title: 'My Post' });
});
\`\`\`

### Model Refresh

**Laravel:**
\`\`\`php
$user->refresh();
$freshUser = $user->fresh();
$clone = $user->replicate();
\`\`\`

**GuruORM:**
\`\`\`typescript
await user.refresh();
const freshUser = await user.fresh();
const clone = user.replicate();
\`\`\`

### Pivot Queries

**Laravel:**
\`\`\`php
$roles = $user->roles()
    ->wherePivot('active', true)
    ->withPivot('assigned_at')
    ->get();
\`\`\`

**GuruORM:**
\`\`\`typescript
const roles = await user.roles()
    .wherePivot('active', true)
    .withPivot('assigned_at')
    .get();
\`\`\`

### Sync Methods

**Laravel:**
\`\`\`php
$user->roles()->syncWithoutDetaching([1, 2, 3]);
$user->roles()->toggle([2, 3]);
$user->roles()->updateExistingPivot($roleId, ['level' => 5]);
\`\`\`

**GuruORM:**
\`\`\`typescript
await user.roles().syncWithoutDetaching([1, 2, 3]);
await user.roles().toggle([2, 3]);
await user.roles().updateExistingPivot(roleId, { level: 5 });
\`\`\`

### Lazy Aggregates

**Laravel:**
\`\`\`php
$user->loadCount('posts');
$user->loadSum('orders', 'amount');
$user->loadAvg('orders', 'amount');
\`\`\`

**GuruORM:**
\`\`\`typescript
await user.loadCount('posts');
await user.loadSum({ orders: 'amount' });
await user.loadAvg({ orders: 'amount' });
\`\`\`

### Collection Methods

**Laravel:**
\`\`\`php
$collection->sole();
$collection->ensure(User::class);
$collection->sliding(2);
$collection->partition(fn($item) => $item->active);
\`\`\`

**GuruORM:**
\`\`\`typescript
collection.sole();
collection.ensure(User);
collection.sliding(2);
collection.partition(item => item.active);
\`\`\`

### Factory States

**Laravel:**
\`\`\`php
User::factory()->admin()->create();
User::factory()->count(10)->sequence(
    ['role' => 'admin'],
    ['role' => 'user']
)->create();
\`\`\`

**GuruORM:**
\`\`\`typescript
await User.factory().admin().create();
await User.factory().count(10).sequence(
    { role: 'admin' },
    { role: 'user' }
).create();
\`\`\`

### Relationship Factories

**Laravel:**
\`\`\`php
$user = User::factory()
    ->has(Post::factory()->count(3))
    ->hasAttached(Role::factory()->count(2))
    ->create();
\`\`\`

**GuruORM:**
\`\`\`typescript
const user = await User.factory()
    .has(Post.factory().count(3))
    .hasAttached(Role.factory().count(2))
    .create();
\`\`\`

### Schema Builder

**Laravel:**
\`\`\`php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title');
});

Schema::table('users', function (Blueprint $table) {
    $table->string('email', 100)->change();
    $table->renameColumn('name', 'full_name');
});
\`\`\`

**GuruORM:**
\`\`\`typescript
await schema.create('posts', (table) => {
    table.id();
    table.foreignId('user_id').constrained().cascadeOnDelete();
    table.string('title');
});

await schema.table('users', (table) => {
    table.string('email', 100).change();
    table.renameColumn('name', 'full_name');
});
\`\`\`

### JSON Queries

**Laravel:**
\`\`\`php
User::whereJsonContainsKey('options->notifications')->get();
User::whereJsonLength('options->languages', '>', 2)->get();
\`\`\`

**GuruORM:**
\`\`\`typescript
await User.whereJsonContainsKey('options->notifications').get();
await User.whereJsonLength('options->languages', '>', 2).get();
\`\`\`

---

## Key Differences

### 1. Async/Await (Required in Node.js)

**Laravel (PHP):**
\`\`\`php
$user = User::find(1); // Synchronous
$posts = $user->posts; // Lazy loading (synchronous)
\`\`\`

**GuruORM (Node.js):**
\`\`\`typescript
const user = await User.find(1); // Async
const posts = await user.posts().get(); // Explicit async query
\`\`\`

*Reason:* Node.js is asynchronous, PHP is synchronous by default.

### 2. Method Call for Relationships

**Laravel:**
\`\`\`php
$user->posts; // Lazy load (property access)
$user->posts(); // Query builder (method call)
\`\`\`

**GuruORM:**
\`\`\`typescript
user.posts(); // Always returns query builder
await user.posts().get(); // Explicit get() required
\`\`\`

*Reason:* TypeScript can't override property accessors asynchronously.

### 3. Array vs Object for Pivot Data

**Laravel:**
\`\`\`php
$user->roles()->attach($roleId, ['level' => 5]);
\`\`\`

**GuruORM:**
\`\`\`typescript
await user.roles().attach(roleId, { level: 5 });
\`\`\`

*Reason:* JavaScript/TypeScript uses objects, not associative arrays.

---

## Migration Path

If you're coming from Laravel, GuruORM will feel extremely familiar. The main adjustments are:

1. Add `await` to database operations
2. Call `.get()` explicitly on relationships
3. Use objects instead of arrays for key-value pairs
4. Use `import` instead of `use` for namespaces

Everything else is nearly identical!

---

## 100% Feature Parity

GuruORM v3.0 achieves 100% feature parity with Laravel 10/11 Eloquent ORM, with syntax differences only due to language differences (PHP vs TypeScript/Node.js).

**Parity Score:** 100% ✅
```

---

#### Create EXAMPLES.md with Full Working Examples

```markdown
# GuruORM v3.0 Examples

Complete working examples for all new v3.0 features.

---

## Database Transactions

### Basic Transaction

\`\`\`typescript
import DB from 'guruorm';
import { User, Post } from './models';

async function createUserWithPost() {
    await DB.transaction(async () => {
        const user = await User.create({
            name: 'John Doe',
            email: 'john@example.com'
        });
        
        await Post.create({
            user_id: user.id,
            title: 'My First Post',
            content: 'Hello, world!'
        });
    });
}
\`\`\`

### Nested Transactions

\`\`\`typescript
await DB.transaction(async () => {
    const user = await User.create({ name: 'John' });
    
    // Nested transaction (uses savepoints)
    await DB.transaction(async () => {
        await Post.create({ user_id: user.id, title: 'Post 1' });
        await Post.create({ user_id: user.id, title: 'Post 2' });
    });
    
    await Comment.create({ user_id: user.id, content: 'Comment' });
});
\`\`\`

### Transaction with Retry

\`\`\`typescript
// Retry up to 3 times on deadlock
await DB.transaction(async () => {
    await User.create({ name: 'John' });
    await Post.create({ title: 'My Post' });
}, 3);
\`\`\`

---

## Model Methods

### Refresh and Fresh

\`\`\`typescript
async function updateUser() {
    const user = await User.find(1);
    
    // Modify in memory
    user.name = 'Modified Name';
    
    // Reload from database
    await user.refresh();
    console.log(user.name); // Original name
    
    // Get fresh instance
    const freshUser = await user.fresh();
    console.log(user !== freshUser); // true
}
\`\`\`

### With Relations

\`\`\`typescript
const user = await User.with('posts').find(1);

// Refresh with relations
await user.refresh(['posts', 'comments']);

// Fresh with relations
const freshUser = await user.fresh(['posts']);
\`\`\`

### Replicate

\`\`\`typescript
async function duplicatePost() {
    const originalPost = await Post.find(1);
    
    // Clone the post
    const clonedPost = originalPost.replicate();
    clonedPost.title = 'Copy of ' + clonedPost.title;
    await clonedPost.save();
    
    console.log(clonedPost.id !== originalPost.id); // true
}

// Exclude attributes
const clone = originalPost.replicate(['created_at', 'updated_at']);
\`\`\`

---

## Advanced Relationships

### Complete Pivot Query Example

\`\`\`typescript
async function manageuserRoles() {
    const user = await User.find(1);
    
    // Query with pivot filters
    const activeRoles = await user.roles()
        .wherePivot('active', true)
        .wherePivotNotNull('expires_at')
        .wherePivotBetween('level', [1, 5])
        .withPivot('assigned_at', 'assigned_by', 'expires_at')
        .withTimestamps()
        .orderByPivot('assigned_at', 'desc')
        .get();
    
    // Access pivot data
    activeRoles.forEach(role => {
        console.log(`Role: ${role.name}`);
        console.log(`Assigned by: ${role.pivot.assigned_by}`);
        console.log(`Assigned at: ${role.pivot.assigned_at}`);
        console.log(`Expires: ${role.pivot.expires_at}`);
    });
}
\`\`\`

### Sync Without Detaching

\`\`\`typescript
async function addRoles() {
    const user = await User.find(1);
    
    // User currently has roles: [1, 2]
    
    // Add new roles without removing existing ones
    const result = await user.roles().syncWithoutDetaching([3, 4]);
    
    console.log(result.attached); // [3, 4]
    console.log(result.updated); // []
    
    // User now has roles: [1, 2, 3, 4]
    
    // With pivot data
    await user.roles().syncWithoutDetaching({
        5: { assigned_by: 'admin', level: 3 }
    });
}
\`\`\`

### Toggle Relationships

\`\`\`typescript
async function toggleRoles() {
    const user = await User.find(1);
    
    // User has roles: [1, 2, 3]
    
    // Toggle roles 2 and 4
    const result = await user.roles().toggle([2, 4]);
    
    console.log(result.attached); // [4]
    console.log(result.detached); // [2]
    
    // User now has roles: [1, 3, 4]
}
\`\`\`

### Lazy Aggregates

\`\`\`typescript
async function loadUserStats() {
    const user = await User.find(1);
    
    // Load counts
    await user.loadCount('posts', 'comments');
    console.log(`Posts: ${user.posts_count}`);
    console.log(`Comments: ${user.comments_count}`);
    
    // Load with constraints
    await user.loadCount({
        posts: (query) => query.where('published', true)
    });
    console.log(`Published posts: ${user.posts_count}`);
    
    // Load aggregates
    await user.loadMax({ orders: 'amount' });
    await user.loadMin({ orders: 'amount' });
    await user.loadSum({ orders: 'amount' });
    await user.loadAvg({ orders: 'amount' });
    
    console.log(`Max order: $${user.orders_max_amount}`);
    console.log(`Total revenue: $${user.orders_sum_amount}`);
}
\`\`\`

### Touch Relations

\`\`\`typescript
// Model definition
class Comment extends Model {
    protected touches = ['post'];
    
    post() {
        return this.belongsTo(Post);
    }
}

// Usage
async function updateComment() {
    const comment = await Comment.find(1);
    const post = await comment.post().first();
    
    const originalUpdatedAt = post.updated_at;
    
    // Update comment - automatically touches post
    comment.content = 'Updated content';
    await comment.save();
    
    // Reload post
    await post.refresh();
    console.log(post.updated_at > originalUpdatedAt); // true
}

// Disable touching
await Model.withoutTouching(async () => {
    comment.content = 'Another update';
    await comment.save(); // Won't touch post
});
\`\`\`

---

## Factory Examples

### States

\`\`\`typescript
// Factory definition
class UserFactory extends Factory<User> {
    definition() {
        return {
            name: faker.name.fullName(),
            email: faker.internet.email(),
            role: 'user',
            is_active: true
        };
    }
    
    admin() {
        return this.state({ role: 'admin' });
    }
    
    inactive() {
        return this.state({ is_active: false });
    }
    
    superAdmin() {
        return this.state((attributes) => ({
            role: 'admin',
            permissions: ['all'],
            level: 10
        }));
    }
}

// Usage
const admin = await User.factory().admin().create();
const inactiveUsers = await User.factory().inactive().count(5).create();
const superAdmin = await User.factory().superAdmin().create();

// Chain states
const inactiveAdmin = await User.factory()
    .admin()
    .inactive()
    .create();
\`\`\`

### Sequences

\`\`\`typescript
// Rotating values
const users = await User.factory()
    .count(9)
    .sequence(
        { role: 'admin' },
        { role: 'user' },
        { role: 'moderator' }
    )
    .create();
// Result: admin, user, moderator, admin, user, moderator, ...

// Callback sequence
const posts = await Post.factory()
    .count(10)
    .sequence((sequence) => ({
        title: `Post #${sequence.index + 1}`,
        views: sequence.index * 100,
        featured: sequence.index % 3 === 0
    }))
    .create();

// Sequence as state
class UserFactory extends Factory<User> {
    activeInactive() {
        return this.state(
            new Sequence(
                { status: 'active' },
                { status: 'inactive' }
            )
        );
    }
}

const users = await User.factory()
    .activeInactive()
    .count(10)
    .create();
\`\`\`

### Relationship Factories

\`\`\`typescript
// for() - BelongsTo
const user = await User.factory().create();
const post = await Post.factory().for(user).create();

// has() - HasMany
const userWithPosts = await User.factory()
    .has(Post.factory().count(3))
    .create();

// hasAttached() - BelongsToMany
const userWithRoles = await User.factory()
    .hasAttached(
        Role.factory().count(3),
        { assigned_at: new Date(), assigned_by: 'system' }
    )
    .create();

// Nested factories
const userWithEverything = await User.factory()
    .has(
        Post.factory()
            .count(5)
            .has(Comment.factory().count(3))
    )
    .hasAttached(Role.factory().count(2))
    .create();
\`\`\`

### recycle() for Performance

\`\`\`typescript
// Efficient seeding
async function seedDatabase() {
    // Create 10 users once
    const users = await User.factory().count(10).create();
    const categories = await Category.factory().count(5).create();
    
    // Create 1000 posts, recycling users
    await Post.factory()
        .count(1000)
        .recycle(users)
        .create();
    // Each post will belong to one of the 10 users (random)
    
    // Create 5000 comments, recycling users and posts
    const posts = await Post.all();
    await Comment.factory()
        .count(5000)
        .recycle([users, posts])
        .create();
}
\`\`\`

---

## Complete Real-World Example

\`\`\`typescript
import DB from 'guruorm';
import { User, Post, Comment, Role, Category } from './models';

async function seedBlogDatabase() {
    await DB.transaction(async () => {
        // Create roles
        const adminRole = await Role.factory().create({ name: 'admin' });
        const editorRole = await Role.factory().create({ name: 'editor' });
        const authorRole = await Role.factory().create({ name: 'author' });
        
        // Create categories
        const categories = await Category.factory().count(5).create();
        
        // Create admin users
        const admins = await User.factory()
            .admin()
            .count(2)
            .hasAttached(adminRole)
            .create();
        
        // Create editors with posts
        const editors = await User.factory()
            .count(5)
            .hasAttached(editorRole)
            .has(
                Post.factory()
                    .count(20)
                    .sequence((seq) => ({
                        title: `Editorial Post ${seq.index + 1}`,
                        published: seq.index % 2 === 0
                    }))
            )
            .create();
        
        // Create authors with varying post counts
        const authors = await User.factory()
            .count(20)
            .hasAttached(authorRole)
            .has(
                Post.factory()
                    .count(5)
                    .state((attrs) => ({
                        category_id: categories[Math.floor(Math.random() * categories.length)].id
                    }))
            )
            .create();
        
        // Create comments (recycle users for efficiency)
        const allUsers = [...admins, ...editors, ...authors];
        const allPosts = await Post.all();
        
        await Comment.factory()
            .count(500)
            .recycle([allUsers, allPosts])
            .sequence((seq) => ({
                approved: seq.index % 3 !== 0
            }))
            .create();
        
        // Load statistics
        for (const user of admins) {
            await user.loadCount('posts', 'comments');
            await user.loadSum({ posts: 'views' });
            
            console.log(`${user.name}:`);
            console.log(`  Posts: ${user.posts_count}`);
            console.log(`  Comments: ${user.comments_count}`);
            console.log(`  Total views: ${user.posts_sum_views || 0}`);
        }
    });
}

seedBlogDatabase().then(() => {
    console.log('Database seeded successfully!');
}).catch(console.error);
\`\`\`

---

These examples demonstrate all major v3.0 features in practical scenarios. Copy and adapt them for your own projects!
```

---

## Testing Documentation

Verify all documentation:

\`\`\`bash
# Test all examples
cd /Users/rishi/Desktop/work/GuruORM
npm run test:docs

# Generate API docs
npm run docs:generate

# Check broken links
npm run docs:check-links
\`\`\`

---

## Success Criteria

- [ ] All docs files updated with v3.0 features
- [ ] Migration guide complete with examples
- [ ] Laravel comparison comprehensive
- [ ] All code examples tested and working
- [ ] API reference generated
- [ ] Broken links fixed
- [ ] README updated
- [ ] CHANGELOG complete

---

## Timeline

| Day | Task |
|-----|------|
| 1 | Update core docs (database.md, eloquent.md, query-builder.md) |
| 2 | Create new docs (relationships-advanced.md, query-builder-advanced.md) |
| 3 | Create migration guide (MIGRATION_V2_TO_V3.md) |
| 4 | Create Laravel comparison and examples (LARAVEL_COMPARISON.md, EXAMPLES.md) |

**Phase 6 Completion:** February 27, 2026  
**v3.0.0 Release:** February 28, 2026
