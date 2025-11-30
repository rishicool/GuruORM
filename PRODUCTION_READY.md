# GuruORM Production Readiness Guide

This document addresses all production concerns and shows how GuruORM is enterprise-ready.

## ✅ Critical Production Features

### 1. Migration Tracking ✅ **WORKING**

**Problem:** Need to track which migrations have run to avoid re-running them.

**Solution:** GuruORM automatically creates and manages a `migrations` table.

```bash
# Check migration status
npx guruorm migrate:status

# Output shows which migrations have run:
┌─────────────────────────────────────────┬─────────┬─────────┐
│ Migration                                │ Batch   │ Status  │
├─────────────────────────────────────────┼─────────┼─────────┤
│ 2025_11_29_145247_create_users_table   │    1    │   ✅    │
│ 2025_11_29_234218_create_test_table    │    1    │   ✅    │
│ 2025_11_30_120000_add_index            │    2    │   ✅    │
└─────────────────────────────────────────┴─────────┴─────────┘
```

**Features:**
- ✅ Automatic `migrations` table creation
- ✅ Batch number tracking
- ✅ Prevents duplicate runs
- ✅ Selective rollback by batch
- ✅ Works across all databases (MySQL, PostgreSQL, SQLite, SQL Server)

---

### 2. Transaction-Wrapped Migrations ✅ **FIXED IN v1.13.0**

**Problem:** If a migration fails halfway, database is left in inconsistent state.

**Solution:** Each migration runs inside a transaction - all or nothing.

```typescript
// In Migrator.ts - automatically wraps each migration
await this.connection.transaction(async () => {
  await migration.up();
  await this.logMigration(migrationFile.name, batch);
});
```

**Benefits:**
- ✅ Atomic migrations - either fully succeeds or fully fails
- ✅ No partial schema changes
- ✅ Safe to retry failed migrations
- ✅ Automatic rollback on error

**Example:**
```bash
# If this migration fails halfway:
await Schema.create('users', (table) => {
  table.id();
  table.string('email');
  table.foreign('company_id').references('id').on('companies'); // FAILS
});

# Result: NO table is created (transaction rollback)
# NOT: Half-created table without foreign key
```

---

### 3. Rollback Support ✅ **WORKING**

**Problem:** Need to undo migrations in production.

**Solution:** Full rollback support with multiple strategies.

```bash
# Rollback last batch
npx guruorm migrate:rollback

# Rollback specific number of batches
npx guruorm migrate:rollback --step=2

# Rollback all migrations
npx guruorm migrate:reset

# Fresh start (reset + migrate)
npx guruorm migrate:fresh

# Refresh (reset + migrate + seed)
npx guruorm migrate:refresh --seed

# Production safety
npx guruorm migrate:rollback --force  # Required in NODE_ENV=production
```

**Features:**
- ✅ Batch-based rollback
- ✅ Step-by-step rollback
- ✅ Transaction-wrapped (atomic)
- ✅ Production safety checks
- ✅ Detailed logging

---

### 4. Dry Run Mode ✅ **WORKING**

**Problem:** Need to preview SQL before running in production.

**Solution:** `--pretend` flag shows what would happen without executing.

```bash
# Preview migrations without running
npx guruorm migrate --pretend

# Output:
Would run: 2025_11_30_create_products_table
Would run: 2025_11_30_add_price_column

# Preview rollback
npx guruorm migrate:rollback --pretend

# Output:
Would rollback: 2025_11_30_add_price_column
Would rollback: 2025_11_30_create_products_table
```

**Use Cases:**
- ✅ Code review process
- ✅ Pre-deployment validation
- ✅ Training/documentation
- ✅ Risk-free testing

---

### 5. Connection Pooling ✅ **WORKING**

**Problem:** Need efficient connection management for high concurrency.

**Solution:** Built-in connection pooling with configurable limits.

```javascript
const capsule = new Capsule();

capsule.addConnection({
  driver: 'postgres',
  host: 'localhost',
  database: 'production_db',
  username: 'user',
  password: 'secure_password',
  
  // Production pool configuration
  pool: {
    min: 5,                    // Keep 5 connections warm
    max: 20,                   // Max 20 concurrent connections
    acquireTimeoutMillis: 30000,  // 30s timeout to acquire
    idleTimeoutMillis: 30000,     // Close idle after 30s
    createTimeoutMillis: 3000,    // 3s timeout to create
  },
});
```

**Recommended Pool Sizes:**
- **Small App** (< 100 concurrent users): `min: 2, max: 10`
- **Medium App** (100-1000 users): `min: 5, max: 20`
- **Large App** (> 1000 users): `min: 10, max: 50`

**Benefits:**
- ✅ Reuses connections efficiently
- ✅ Prevents connection exhaustion
- ✅ Configurable per environment
- ✅ Automatic connection lifecycle
- ✅ Works with MySQL, PostgreSQL, SQL Server

See `examples/connection-pooling.js` for detailed configuration.

---

### 6. Selective Seeding ✅ **WORKING**

**Problem:** Need to run specific seeders, not all at once.

**Solution:** `--class` option to run specific seeder.

```bash
# Run specific seeder
npx guruorm db:seed --class=UserSeeder
npx guruorm db:seed --class=PermissionsSeeder
npx guruorm db:seed --class=RolesSeeder

# Run default DatabaseSeeder
npx guruorm db:seed

# With fresh migrations
npx guruorm migrate:fresh --seed
```

**File Structure:**
```
database/
  seeders/
    DatabaseSeeder.js      # Default seeder
    UserSeeder.js          # Specific seeder
    PermissionsSeeder.js   # Specific seeder
```

---

## 🔒 Production Safety Features

### 1. Environment Protection

```bash
# Development: No confirmation needed
npx guruorm migrate

# Production: Requires --force flag
NODE_ENV=production npx guruorm migrate
# Error: ❌ Use --force to run migrations in production

NODE_ENV=production npx guruorm migrate --force
# ✅ Runs with explicit confirmation
```

### 2. Error Handling

All migration operations include:
- ✅ Detailed error messages
- ✅ Stack traces for debugging
- ✅ Transaction rollback on failure
- ✅ Exit codes for CI/CD
- ✅ Colored console output

### 3. Logging

```javascript
// Enable query logging
capsule.connection().enableQueryLog();

// View all queries
const log = capsule.connection().getQueryLog();
console.log(log);

// Output:
[
  { query: 'SELECT * FROM users WHERE id = ?', bindings: [1], time: 15 },
  { query: 'INSERT INTO posts VALUES (?, ?)', bindings: [...], time: 8 }
]
```

---

## 📊 Performance Features

### 1. Batch Processing

```javascript
// Chunk large datasets
await DB.table('users').chunk(100, async (users) => {
  for (const user of users) {
    await processUser(user);
  }
});

// Prevents memory overflow
// Processes 100 records at a time
```

### 2. Eager Loading

```javascript
// ❌ N+1 Problem (100 queries)
const users = await User.all();
for (const user of users) {
  const posts = await user.posts().get(); // Extra query per user
}

// ✅ Eager Loading (2 queries)
const users = await User.with('posts').get();
for (const user of users) {
  const posts = user.getRelation('posts'); // Already loaded
}
```

### 3. Query Optimization

```javascript
// Select only needed columns
const users = await DB.table('users')
  .select('id', 'name', 'email')
  .where('active', true)
  .get();

// Use indexes
await Schema.table('users', (table) => {
  table.index('email');
  table.index(['company_id', 'role']);
});

// Raw queries when needed
const stats = await DB.select(`
  SELECT
    DATE(created_at) as date,
    COUNT(*) as count
  FROM orders
  WHERE created_at >= ?
  GROUP BY DATE(created_at)
`, [thirtyDaysAgo]);
```

---

## 🛡️ Security Features

### 1. SQL Injection Protection

```javascript
// ✅ Safe: Prepared statements
await DB.select('SELECT * FROM users WHERE email = ?', [userInput]);

// ✅ Safe: Query builder
await DB.table('users').where('email', userInput).get();

// ❌ Unsafe: Don't do this
await DB.select(`SELECT * FROM users WHERE email = '${userInput}'`);

// ✅ Safe: Raw expressions in controlled contexts
await DB.table('users')
  .select('id', DB.raw('COUNT(*) as total'))
  .groupBy('id')
  .get();
```

### 2. Mass Assignment Protection

```javascript
class User extends Model {
  // Only these fields can be mass-assigned
  protected fillable = ['name', 'email'];
  
  // These are protected
  protected guarded = ['id', 'role', 'is_admin'];
}

// ✅ Safe: Only name and email are set
await User.create({
  name: 'John',
  email: 'john@example.com',
  is_admin: true  // Ignored due to guarded
});
```

---

## 📋 Production Checklist

Before deploying to production:

- ✅ Set up connection pooling with appropriate limits
- ✅ Enable query logging for monitoring
- ✅ Set `NODE_ENV=production`
- ✅ Test migrations with `--pretend` first
- ✅ Configure database connection limits
- ✅ Set up database backups
- ✅ Test rollback procedures
- ✅ Define fillable/guarded fields on models
- ✅ Use indexes on frequently queried columns
- ✅ Use eager loading to avoid N+1 queries
- ✅ Set up error monitoring (Sentry, etc.)
- ✅ Configure timeouts appropriately
- ✅ Test under load (stress testing)
- ✅ Document your schema (migrations are self-documenting)

---

## 🚀 Deployment Workflow

### Option 1: Manual Deployment

```bash
# 1. Backup database
pg_dump mydb > backup.sql

# 2. Preview migrations
NODE_ENV=production npx guruorm migrate --pretend

# 3. Run migrations
NODE_ENV=production npx guruorm migrate --force

# 4. Verify
NODE_ENV=production npx guruorm migrate:status

# 5. If issues, rollback
NODE_ENV=production npx guruorm migrate:rollback --force
```

### Option 2: CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
deploy:
  steps:
    - name: Checkout code
      uses: actions/checkout@v2
    
    - name: Install dependencies
      run: npm install
    
    - name: Preview migrations
      run: npx guruorm migrate --pretend
      env:
        NODE_ENV: production
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
    
    - name: Run migrations
      run: npx guruorm migrate --force
      env:
        NODE_ENV: production
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
    
    - name: Seed data (if needed)
      run: npx guruorm db:seed --class=ProductionSeeder --force
      if: github.ref == 'refs/heads/main'
```

---

## 🔍 Monitoring in Production

### Query Performance

```javascript
import { QueryLogger } from 'guruorm';

// Set up logger
const logger = new QueryLogger();
logger.onQuery((query) => {
  if (query.time > 1000) {
    console.warn(`Slow query detected: ${query.sql} (${query.time}ms)`);
    // Send to monitoring service
  }
});

// Attach to connection
capsule.connection().setQueryLogger(logger);
```

### Connection Pool Monitoring

```javascript
// Check pool stats periodically
setInterval(() => {
  const connection = capsule.connection();
  console.log('Pool status:', {
    driver: connection.getDriverName(),
    active: 'Use pool.getPoolSize() if available',
  });
}, 60000); // Every minute
```

---

## 📚 Additional Resources

- **Migration Guide**: [docs/migrations.md](docs/migrations.md)
- **Query Builder**: [docs/query-builder.md](docs/query-builder.md)
- **Eloquent ORM**: [docs/eloquent.md](docs/eloquent.md)
- **Complete Examples**: [examples/complete-workflow.js](examples/complete-workflow.js)
- **Pool Configuration**: [examples/connection-pooling.js](examples/connection-pooling.js)

---

## ✅ Summary

**GuruORM is production-ready with:**

1. ✅ **Migration Tracking** - Automatic `migrations` table with batch tracking
2. ✅ **Transaction Safety** - All migrations run in transactions
3. ✅ **Rollback Support** - Multiple rollback strategies
4. ✅ **Dry Run Mode** - Preview changes with `--pretend`
5. ✅ **Connection Pooling** - Configurable pool sizes
6. ✅ **Selective Seeding** - Run specific seeders with `--class`
7. ✅ **Production Safety** - `--force` flag required in production
8. ✅ **SQL Injection Protection** - Prepared statements everywhere
9. ✅ **Error Handling** - Detailed errors and automatic rollback
10. ✅ **Performance** - Chunking, eager loading, query optimization

**All critical production issues are resolved!** 🎉
