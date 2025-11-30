# GuruORM Production Readiness - Issue Report

**Date**: November 30, 2025  
**Project**: Neastore (MongoDB → PostgreSQL Migration)  
**ORM**: GuruORM 1.12.0  

---

## Executive Summary

We successfully migrated 1,017 records across 22 tables from MongoDB to PostgreSQL using GuruORM. While the core ORM functionality works well, several critical features are missing for production-grade database management.

**Current Status**: ✅ Working but needs improvements  
**Migration Success**: 22 tables, 1,017 records, 100% data integrity  
**Workaround**: Custom migration and seeding runners  

---

## 🔴 Critical Issues (P0)

### 1. No Migration Tracking Table

**Problem**:
- Every migration run executes ALL migrations again
- No `migrations` table to track which migrations already ran
- Can't determine migration status or history
- Risk of duplicate table creation errors

**Current Behavior**:
```bash
node migrate.js
# Runs ALL 22 migrations every time
# No check if already executed
```

**Expected Behavior**:
```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  migration VARCHAR(255),
  batch INTEGER,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

**Impact**: 🔴 High - Can't safely re-run migrations in production

**Workaround**: Drop all tables before running migrations (not production safe)

---

### 2. No Transaction Wrapping

**Problem**:
- Migrations run without transactions
- If migration fails midway, database left in partial state
- No automatic rollback on error

**Current Behavior**:
```javascript
// Migration fails at step 5 of 10
// Steps 1-4 remain committed
// Database in inconsistent state
```

**Expected Behavior**:
```javascript
await connection.transaction(async (trx) => {
  await migration.up();
  // If error, entire migration rolls back
});
```

**Impact**: 🔴 Critical - Data corruption risk in production

**Workaround**: Manual database restore from backup

---

### 3. No Rollback Support

**Problem**:
- `down()` methods exist in migrations but no runner
- Can't undo migrations
- No `migrate:rollback` command

**Current Implementation**:
```javascript
export default class CreateUsersTable {
  async up() { /* works */ }
  async down() { /* exists but never called */ }
}
```

**Expected Commands**:
```bash
npx guruorm migrate:rollback          # Rollback last batch
npx guruorm migrate:rollback --step=2 # Rollback 2 batches
npx guruorm migrate:reset             # Rollback all
npx guruorm migrate:fresh             # Drop all + migrate
```

**Impact**: 🔴 High - No recovery from bad migrations

**Workaround**: Manual SQL to drop tables and re-run

---

## 🟡 High Priority Issues (P1)

### 4. No Dry Run / Pretend Mode

**Problem**:
- Can't preview SQL before execution
- Risky for production environments
- No way to validate migration SQL

**Expected Feature**:
```bash
node migrate.js --pretend
# Shows SQL that would be executed
# Doesn't actually run migrations
```

**Impact**: 🟡 Medium - Higher risk deployments

---

### 5. Connection Pool Configuration Unclear

**Problem**:
- No visibility into connection pool settings
- Default pool size unknown
- Can't configure max connections

**Current Config**:
```javascript
capsule.addConnection({
  driver: 'pgsql',
  host: 'localhost',
  // Where are pool settings?
  // min: ?, max: ?, idle: ?
});
```

**Expected Config**:
```javascript
capsule.addConnection({
  driver: 'pgsql',
  host: 'localhost',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000
  }
});
```

**Impact**: 🟡 Medium - Performance tuning limited

---

### 6. No Selective Seeding

**Problem**:
- Must run ALL seeders every time
- Can't run specific seeder
- No `--class` option

**Current**:
```bash
node seed-runner.js
# Runs all 23 seeders (1,017 records)
# No way to run just PermissionsSeeder
```

**Expected**:
```bash
npx guruorm db:seed --class=PermissionsSeeder
npx guruorm db:seed --class=CategoriesSeeder,BrandsSeeder
```

**Impact**: 🟡 Medium - Slow development workflow

**Workaround**: Comment out seeders in DatabaseSeeder.js

---

## 🟢 Nice to Have (P2)

### 7. No Model Generator

**Problem**:
- Manual model creation
- No `make:model` command
- Can't generate from existing schema

**Expected**:
```bash
npx guruorm make:model User
npx guruorm make:model Product --migration
npx guruorm make:model Order --factory --seeder
```

**Impact**: 🟢 Low - Extra manual work

---

### 8. Limited Foreign Key Support

**Problem**:
- UUIDs work but no explicit FK constraints
- No `table.foreign()` method
- Manual reference tracking

**Current**:
```javascript
table.uuid('user_id'); // Just a column
// No FK constraint
// No cascade delete
```

**Expected**:
```javascript
table.uuid('user_id');
table.foreign('user_id')
  .references('id')
  .on('users')
  .onDelete('CASCADE');
```

**Impact**: 🟢 Low - Relationships work in code, just no DB-level enforcement

---

### 9. No Schema Caching

**Problem**:
- Schema introspection on every query
- Slower performance for large tables
- No caching mechanism

**Expected**:
```bash
npx guruorm schema:cache
# Generates schema cache file
# Faster query building
```

**Impact**: 🟢 Low - Performance optimization

---

### 10. No Migration Squashing

**Problem**:
- 22 individual migration files for initial schema
- Fresh install runs all 22
- Could be single schema dump

**Expected**:
```bash
npx guruorm migrate:squash
# Combines migrations into single schema file
# Faster fresh installs
```

**Impact**: 🟢 Low - Convenience feature

---

## Working Solutions (No Changes Needed)

### ✅ What's Working Well

1. **Schema Builder API**
   - `capsule.schema().create()` works perfectly
   - Full table builder: `uuid()`, `string()`, `text()`, `timestamps()`, `softDeletes()`
   - Indexes and constraints work

2. **Query Builder**
   - `DB.table().insert()` batch inserts work great
   - `DB.table().where()` queries work
   - JSON column support (`jsonb()`)

3. **UUID Primary Keys**
   - `uuid_generate_v4()` defaults work
   - MongoDB ObjectId → UUID conversion successful

4. **Soft Deletes**
   - `deleted_at` column support
   - `softDeletes()` method works

5. **Timestamps**
   - `created_at`, `updated_at` auto-handling
   - `timestamps()` method works

---

## Recommendations

### Immediate Actions (P0)

1. **Add Migration Tracking**
   - Create `migrations` table on first run
   - Store migration name + batch number
   - Skip already-run migrations
   - Reference: Laravel, Knex.js migration tracking

2. **Wrap Migrations in Transactions**
   - Start transaction before `up()`
   - Commit on success
   - Rollback on error
   - Preserve database consistency

3. **Implement Rollback Runner**
   - Create `migrate:rollback` command
   - Read migrations table in reverse
   - Call `down()` methods
   - Track batch rollbacks

### Short Term (P1)

4. **Add Dry Run Mode**
   - `--pretend` flag
   - Log SQL without execution
   - Validate before production

5. **Document Pool Configuration**
   - Show default pool settings
   - Add configuration options
   - Document best practices

6. **Selective Seeder Execution**
   - `--class=SeederName` option
   - Multiple seeder support
   - Skip already-seeded check

### Long Term (P2)

7. **Model Generator**
8. **Foreign Key Builder**
9. **Schema Caching**
10. **Migration Squashing**

---

## Current Workarounds

We've implemented these temporary solutions:

### Custom Migration Runner (`database/migrate.js`)
```javascript
// Runs all migrations without tracking
// Works but not production-safe
// No rollback capability
```

### Custom Seeder Runner (`database/seed-runner.js`)
```javascript
// Runs all seeders via DatabaseSeeder
// Manual batch normalization
// ObjectId → UUID conversion
```

### Manual Schema Fixes
- Changed `text_body` VARCHAR → TEXT
- Changed `razorpay_order_id` UUID → VARCHAR
- Changed `system_configs.value` INTEGER → TEXT

---

## Testing Evidence

### Migration Success
```
✅ 22 migrations executed
✅ All tables created with proper schema
✅ UUID primary keys with defaults
✅ Soft deletes and timestamps working
```

### Seeding Success
```
✅ 1,017 records seeded successfully
✅ 819 categories
✅ 55 permissions
✅ 16 brands
✅ 10 orders
✅ All data integrity verified
```

### Data Verification
```sql
SELECT COUNT(*) FROM categories; -- 819 ✅
SELECT COUNT(*) FROM permissions; -- 55 ✅
SELECT COUNT(*) FROM users; -- 6 ✅
-- All counts match MongoDB export
```

---

## Conclusion

GuruORM's core ORM functionality is solid and production-ready. However, the migration system needs critical improvements for safe production use:

**Must Have**:
- Migration tracking table
- Transaction wrapping
- Rollback support

**Should Have**:
- Dry run mode
- Pool configuration
- Selective seeding

**Nice to Have**:
- Model generator
- FK constraints
- Schema caching

**Current State**: ✅ Works with custom runners  
**Production Ready**: ⚠️ With workarounds  
**Recommendation**: Implement P0 fixes before production deployment

---

## Contact

For GuruORM improvements, please contact the GuruORM development team with this report.

**Migration Date**: November 30, 2025  
**Total Time**: ~4 hours for complete migration  
**Success Rate**: 100% data integrity  
