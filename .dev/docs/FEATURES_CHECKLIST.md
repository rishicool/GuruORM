# GuruORM Feature Checklist

## ✅ = Implemented | ⚠️ = Partial | ❌ = Missing

---

## **QUERY BUILDER** 

### Basic Query Operations
- ✅ `table()` - Select from table
- ✅ `select()` - Select columns
- ✅ `distinct()` - Distinct results
- ✅ `from()` - From clause
- ✅ `get()` - Execute query
- ✅ `first()` - Get first result
- ✅ `firstOrFail()` - Get first or throw exception
- ✅ `find()` - Find by ID
- ✅ `findOrFail()` - Find or throw exception
- ✅ `value()` - Get single column value

### WHERE Clauses
- ✅ `where()` - Basic where
- ✅ `orWhere()` - Or where
- ✅ `whereNot()` / `orWhereNot()` - Negated where
- ✅ `whereIn()` / `whereNotIn()` - In array
- ✅ `orWhereIn()` / `orWhereNotIn()` - Or in array
- ✅ `whereBetween()` / `whereNotBetween()` - Between values
- ✅ `orWhereBetween()` / `orWhereNotBetween()` - Or between
- ✅ `whereNull()` / `whereNotNull()` - Null checks
- ✅ `orWhereNull()` / `orWhereNotNull()` - Or null checks
- ✅ `whereColumn()` - Column comparison
- ✅ `orWhereColumn()` - Or column comparison
- ✅ `whereExists()` / `whereNotExists()` - Exists subquery
- ✅ `orWhereExists()` / `orWhereNotExists()` - Or exists
- ✅ `whereRaw()` / `orWhereRaw()` - Raw where
- ✅ `whereLike()` / `orWhereLike()` - LIKE clause
- ✅ `whereNotLike()` / `orWhereNotLike()` - NOT LIKE
- ✅ `whereAny()` / `whereAll()` / `whereNone()` - Multiple column where
- ✅ `whereDate()` / `whereMonth()` / `whereDay()` / `whereYear()` / `whereTime()` - Date comparisons
- ✅ `whereToday()` / `whereBeforeToday()` / `whereAfterToday()` - Today comparisons
- ✅ `whereTodayOrBefore()` / `whereTodayOrAfter()` - Today or comparisons
- ✅ `whereJsonContains()` / `whereJsonDoesntContain()` - JSON array contains
- ✅ `whereJsonLength()` - JSON array length
- ❌ `whereValueBetween()` / `whereValueNotBetween()` - Value between columns
- ✅ `whereFullText()` / `orWhereFullText()` - Full text search

### JOINS
- ✅ `join()` - Inner join
- ✅ `leftJoin()` - Left join
- ✅ `rightJoin()` - Right join
- ✅ `crossJoin()` - Cross join
- ❌ `joinLateral()` / `leftJoinLateral()` - Lateral joins (PostgreSQL, MySQL 8+)
- ✅ Advanced join with closures

### Aggregates
- ✅ `count()` - Count records
- ✅ `max()` - Maximum value
- ✅ `min()` - Minimum value
- ✅ `avg()` - Average value
- ✅ `sum()` - Sum values
- ✅ `exists()` / `doesntExist()` - Check existence

### Ordering & Grouping
- ✅ `orderBy()` - Order by column
- ✅ `orderByDesc()` - Order descending
- ✅ `orderByRaw()` - Raw order by
- ✅ `latest()` / `oldest()` - Order by created_at
- ✅ `inRandomOrder()` - Random ordering
- ✅ `reorder()` - Remove existing orderings
- ✅ `groupBy()` - Group by
- ✅ `groupByRaw()` - Raw group by
- ✅ `having()` - Having clause
- ✅ `orHaving()` - Or having
- ✅ `havingRaw()` / `orHavingRaw()` - Raw having
- ✅ `havingBetween()` - Having between

### Limit & Offset
- ✅ `limit()` / `take()` - Limit results
- ✅ `offset()` / `skip()` - Skip results
- ✅ `forPage()` - Pagination helper

### Chunking & Streaming
- ✅ `chunk()` - Process in chunks
- ✅ `chunkById()` - Chunk by ID (safe for updates)
- ✅ `lazy()` - Lazy collection stream
- ✅ `lazyById()` / `lazyByIdDesc()` - Lazy by ID
- ✅ `cursor()` - Generator-based iteration

### Insert Operations
- ✅ `insert()` - Insert records
- ✅ `insertGetId()` - Insert and get ID
- ✅ `insertOrIgnore()` - Insert or ignore duplicates
- ❌ `insertUsing()` - Insert using subquery
- ✅ `upsert()` - Insert or update

### Update Operations
- ✅ `update()` - Update records
- ✅ `updateOrInsert()` - Update or insert
- ❌ `updateFrom()` - Update with from clause
- ✅ `increment()` / `decrement()` - Increment/decrement values
- ✅ `incrementEach()` / `decrementEach()` - Multiple column increment

### Delete Operations
- ✅ `delete()` - Delete records
- ✅ `truncate()` - Truncate table

### JSON Operations
- ❌ `->` operator for JSON columns
- ❌ `whereJsonContains()` - JSON contains
- ❌ `whereJsonLength()` - JSON length
- ❌ Update JSON columns

### Unions
- ✅ `union()` - Union queries
- ✅ `unionAll()` - Union all

### Locks
- ✅ `sharedLock()` - Shared lock (FOR SHARE)
- ✅ `lockForUpdate()` - Exclusive lock (FOR UPDATE)

### Conditional Clauses
- ✅ `when()` - Conditional query building
- ✅ `unless()` - Inverse of when

### Raw Expressions
- ✅ `raw()` - Raw expression
- ✅ `selectRaw()` - Raw select
- ✅ `whereRaw()` / `orWhereRaw()` - Raw where
- ✅ `havingRaw()` / `orHavingRaw()` - Raw having
- ✅ `orderByRaw()` - Raw order
- ✅ `groupByRaw()` - Raw group

### Debugging
- ✅ `dd()` / `dump()` - Debug query
- ✅ `dumpRawSql()` / `ddRawSql()` - Debug with bindings
- ✅ `explain()` - Query explain
- ✅ `toSql()` - Get SQL string
- ✅ `getBindings()` - Get bindings
- ✅ `toRawSql()` - Get SQL with bindings interpolated

---

## **ELOQUENT ORM**

### Model Basics
- ✅ Model class
- ✅ `$table` - Table name
- ✅ `$primaryKey` - Primary key column
- ✅ `$incrementing` - Auto-increment flag
- ✅ `$timestamps` - Timestamp management
- ✅ `$dateFormat` - Date format
- ✅ `$connection` - Database connection
- ✅ `$fillable` - Mass assignable fields
- ✅ `$guarded` - Guarded fields
- ✅ `$hidden` - Hidden fields for serialization
- ✅ `$visible` - Visible fields
- ✅ `$appends` - Appended accessors
- ✅ `$casts` - Attribute casting
- ✅ `$attributes` - Default attribute values

### UUID/ULID Support
- ✅ `HasUuids` trait
- ✅ `HasUlids` trait
- ✅ `UuidModel` base class
- ✅ `UlidModel` base class

### Retrieving Models
- ✅ `all()` - Get all models
- ✅ `find()` - Find by ID
- ✅ `findOrFail()` - Find or throw exception
- ✅ `findMany()` - Find multiple IDs
- ✅ `first()` / `firstOrFail()` - Get first
- ✅ `firstOr()` - First or callback
- ✅ `firstOrCreate()` - First or create
- ✅ `firstOrNew()` - First or new instance
- ✅ `updateOrCreate()` - Update or create
- ✅ Query builder methods on models

### Saving Models
- ✅ `save()` - Save model
- ✅ `create()` - Create and save
- ✅ `saveQuietly()` - Save without events
- ✅ `update()` - Update model
- ✅ `fill()` - Mass assignment
- ✅ `forceFill()` - Force fill

### Deleting Models
- ✅ `delete()` - Delete model
- ✅ `destroy()` - Destroy by IDs
- ✅ `forceDelete()` - Force delete (soft deletes)

### Soft Deletes
- ✅ `SoftDeletes` trait
- ✅ `SoftDeleteModel` base class
- ✅ `$softDelete` property
- ✅ `trashed()` - Check if soft deleted
- ✅ `restore()` - Restore soft deleted
- ✅ `forceDelete()` - Permanently delete
- ✅ `withTrashed()` - Include soft deleted
- ✅ `onlyTrashed()` - Only soft deleted
- ✅ `restoreQuietly()` - Restore without events

### Relationships
- ✅ `hasOne()` - One-to-one
- ✅ `hasMany()` - One-to-many
- ✅ `belongsTo()` - Inverse one-to-many
- ✅ `belongsToMany()` - Many-to-many
- ✅ `hasOneThrough()` - Has one through
- ✅ `hasManyThrough()` - Has many through
- ✅ `morphOne()` - Polymorphic one-to-one
- ✅ `morphMany()` - Polymorphic one-to-many
- ✅ `morphTo()` - Polymorphic inverse
- ⚠️ `morphToMany()` - Polymorphic many-to-many (basic)
- ⚠️ `morphedByMany()` - Polymorphic many inverse (basic)

### Eager Loading
- ✅ `with()` - Eager load relations
- ✅ `load()` - Lazy eager load
- ✅ `loadMissing()` - Load missing relations
- ✅ `withCount()` - Eager load count
- ✅ `has()` / `whereHas()` - Query relationship existence
- ✅ `doesntHave()` / `whereDoesntHave()` - Query absence
- ✅ `orWhereHas()` / `orWhereDoesntHave()` - OR variants
- ✅ `relationLoaded()` - Check if relation loaded

### Query Scopes
- ✅ Local scopes
- ✅ Global scopes
- ✅ `scope()` prefix convention
- ✅ Dynamic scopes (via `scopes()` method)

### Accessors & Mutators
- ✅ `getAttribute()` - Accessor
- ✅ `setAttribute()` - Mutator
- ✅ Attribute casting
- ✅ Custom casts (`CastsAttributes` interface)
- ✅ Built-in casts: `ArrayCast`, `JsonCast`, `EncryptedCast`, `AsCollectionCast`, `AsStringableCast`

### Model Events
- ✅ `retrieved` event
- ✅ `creating` / `created` events
- ✅ `updating` / `updated` events
- ✅ `saving` / `saved` events
- ✅ `deleting` / `deleted` events
- ✅ `restoring` / `restored` events
- ✅ `replicating` event
- ⚠️ Event observers (basic support)
- ✅ `$dispatchesEvents` property
- ✅ `WithoutModelEvents` trait (via `withoutModelEvents()` method)

### Collections
- ✅ Basic Collection class
- ✅ Eloquent-specific collection methods
- ✅ `contains()` - Check if model exists
- ✅ `diff()` / `intersect()` - Set operations
- ✅ `find()` - Find model by key
- ✅ `fresh()` - Refresh models
- ✅ `modelKeys()` - Get model keys
- ✅ `makeVisible()` / `makeHidden()` - Toggle visibility
- ✅ `unique()` - Unique models
- ✅ `load()` - Load relationships on collection

### Serialization
- ✅ `toArray()` - Convert to array
- ✅ `toJson()` - Convert to JSON
- ✅ `attributesToArray()` - Attributes to array
- ✅ `relationsToArray()` - Relations to array
- ✅ `$hidden` / `$visible` - Control serialization
- ✅ `makeVisible()` / `makeHidden()` - Dynamic visibility
- ✅ `append()` - Append attributes

### Timestamps
- ✅ `$timestamps` property
- ✅ `created_at` / `updated_at` auto-management
- ✅ `touch()` - Update timestamps
- ✅ `withoutTimestamps()` - Disable temporarily

### Pruning Models
- ✅ `Prunable` trait (via `PrunableModel` base class)
- ✅ `MassPrunable` trait (via `MassPrunableModel` base class)
- ✅ `model:prune` command
- ❌ `prunable()` method
- ❌ `model:prune` command

### Comparing Models
- ✅ `is()` / `isNot()` - Compare models

### Replicating Models
- ✅ `replicate()` - Clone model

---

## **MIGRATIONS**

### Migration Creation
- ✅ `make:migration` command
- ✅ Migration file naming convention
- ✅ Timestamp prefixes
- ✅ `--create` / `--table` flags
- ⚠️ `--path` option

### Migration Structure
- ✅ `up()` method
- ✅ `down()` method
- ✅ `$connection` property
- ✅ `shouldRun()` method
- ✅ `withinTransaction` property
- ✅ `getConnection()` method

### Running Migrations
- ✅ `migrate` command (via Migrator.run())
- ✅ `migrate:status` - Check migration status
- ✅ `migrate:rollback` - Rollback migrations
- ✅ `migrate:reset` - Reset all migrations
- ✅ `migrate:refresh` - Refresh database
- ✅ `migrate:fresh` - Drop and recreate
- ✅ `--pretend` flag - Show SQL
- ✅ `--force` flag - Production
- ❌ `--isolated` flag - Atomic locks
- ✅ `--step` option - Batch control
- ✅ Batch tracking system
- ✅ Migration file loading
- ✅ Automatic migration table creation

### Schema Builder - Tables
- ⚠️ `Schema::create()` - Create table (basic)
- ⚠️ `Schema::table()` - Modify table (basic)
- ✅ `Schema::drop()` / `dropIfExists()` - Drop table
- ✅ `Schema::rename()` - Rename table
- ✅ `Schema::hasTable()` - Check table exists
- ✅ `Schema::hasColumn()` - Check column exists
- ✅ `Schema::hasColumns()` - Check multiple columns
- ✅ `Schema::hasIndex()` - Check index exists
- ❌ `$table->temporary()` - Temporary table
- ⚠️ `$table->engine()` - Storage engine (MySQL) (in grammar)
- ⚠️ `$table->charset()` / `collation()` - Character set (in grammar)
- ⚠️ `$table->comment()` - Table comment (in grammar)
- ✅ `Schema::getAllTables()` - Get all tables
- ✅ `Schema::dropAllTables()` - Drop all tables
- ✅ `Schema::getColumnType()` - Get column type
- ✅ `Schema::enableForeignKeyConstraints()`
- ✅ `Schema::disableForeignKeyConstraints()`
- ✅ `Schema::withoutForeignKeyConstraints()`

### Schema Builder - Columns (100+ column types)
- ✅ `id()` - Auto-increment ID
- ✅ `bigIncrements()` / `increments()` / `smallIncrements()` / `tinyIncrements()` - Auto-increment
- ✅ `bigInteger()` / `integer()` / `mediumInteger()` / `smallInteger()` / `tinyInteger()` - Integers
- ✅ `unsignedBigInteger()` / `unsignedInteger()` etc - Unsigned integers
- ✅ `string()` / `char()` - Strings
- ✅ `text()` / `mediumText()` / `longText()` / `tinyText()` - Text columns
- ✅ `binary()` - Binary data
- ✅ `boolean()` - Boolean
- ✅ `date()` / `dateTime()` / `dateTimeTz()` - Dates
- ✅ `time()` / `timeTz()` - Time
- ✅ `timestamp()` / `timestampTz()` - Timestamps
- ✅ `timestamps()` / `timestampsTz()` - Created/updated timestamps
- ✅ `softDeletes()` / `softDeletesTz()` - Soft delete timestamp
- ✅ `year()` - Year
- ✅ `decimal()` / `double()` / `float()` - Decimals
- ✅ `enum()` / `set()` - Enums
- ✅ `json()` / `jsonb()` - JSON
- ✅ `uuid()` / `ulid()` - UUIDs/ULIDs
- ⚠️ `foreignId()` / `foreignIdFor()` - Foreign keys (partial)
- ❌ `foreignUuid()` / `foreignUlid()` - Foreign UUID/ULID
- ✅ `morphs()` / `nullableMorphs()` - Polymorphic
- ✅ `uuidMorphs()` / `ulidMorphs()` - UUID/ULID morphs
- ✅ `rememberToken()` - Remember token
- ✅ `ipAddress()` / `macAddress()` - Network addresses
- ✅ `geometry()` / `geography()` - Spatial types
- ❌ `vector()` - Vector column

### Column Modifiers
- ✅ `->nullable()` - Allow NULL
- ✅ `->default()` - Default value
- ✅ `->unsigned()` - Unsigned
- ✅ `->unique()` - Unique constraint
- ✅ `->index()` - Add index
- ✅ `->primary()` - Primary key
- ⚠️ `->after()` - Column order (MySQL) (partial)
- ⚠️ `->first()` - First column (MySQL) (partial)
- ✅ `->autoIncrement()` - Auto-increment
- ❌ `->from()` - Starting value
- ⚠️ `->charset()` / `collation()` - Character set (partial)
- ⚠️ `->comment()` - Column comment (partial)
- ✅ `->invisible()` - Invisible column (MySQL)
- ✅ `->storedAs()` / `virtualAs()` - Generated columns
- ✅ `->useCurrent()` / `useCurrentOnUpdate()` - Current timestamp
- ✅ `->generatedAs()` - Identity column (PostgreSQL)
- ⚠️ `->always()` - Identity precedence (PostgreSQL)

### Modifying Columns
- ⚠️ `->change()` - Modify column (grammar support)
- ✅ `renameColumn()` - Rename column (grammar support)
- ✅ `dropColumn()` - Drop column (grammar support)
- ❌ `dropColumns()` - Drop multiple columns
- ❌ `dropMorphs()` / `dropTimestamps()` etc - Drop special columns
- ✅ `addColumn()` - Add column (grammar support)
- ✅ `modifyColumn()` - Modify column (grammar support)

### Indexes
- ✅ `->index()` - Basic index
- ✅ `->unique()` - Unique index
- ✅ `->primary()` - Primary key
- ✅ `->fullText()` - Full text index
- ✅ `->spatialIndex()` - Spatial index
- ⚠️ Composite indexes
- ✅ `renameIndex()` - Rename index
- ✅ `dropIndex()` / `dropUnique()` / `dropPrimary()` etc - Drop indexes

### Foreign Keys
- ✅ `foreign()` / `constrained()` - Foreign key
- ✅ `cascadeOnDelete()` / `cascadeOnUpdate()` - Cascade
- ✅ `restrictOnDelete()` / `restrictOnUpdate()` - Restrict
- ✅ `nullOnDelete()` / `nullOnUpdate()` - Set null
- ✅ `noActionOnDelete()` / `noActionOnUpdate()` - No action
- ✅ `dropForeign()` - Drop foreign key
- ✅ `enableForeignKeyConstraints()` - Enable constraints
- ✅ `disableForeignKeyConstraints()` - Disable constraints
- ✅ `withoutForeignKeyConstraints()` - Temporary disable

### Migration Events
- ✅ `MigrationsStarted` event
- ✅ `MigrationsEnded` event
- ✅ `MigrationStarted` event
- ✅ `MigrationEnded` event
- ✅ `NoPendingMigrations` event
- ✅ `SchemaDumped` event
- ✅ `SchemaLoaded` event

### Schema Dumping
- ❌ `schema:dump` command
- ❌ `--prune` option
- ❌ Schema file support

---

## **SEEDING**

### Seeder Basics
- ✅ `make:seeder` command
- ✅ `DatabaseSeeder` class
- ✅ `run()` method
- ✅ `call()` - Call other seeders
- ✅ `callWith()` - Call with options (silent mode)
- ✅ `$connection` property
- ✅ `getConnection()` method

### Running Seeders
- ✅ `db:seed` command
- ✅ `--class` option
- ✅ `--force` flag
- ✅ Integration with `migrate:fresh --seed`

### Model Factories
- ✅ `make:factory` command
- ✅ `factory()` method
- ✅ `->times()` - Multiple records (count)
- ✅ `->create()` - Create and save
- ✅ `->make()` - Make without saving
- ✅ `->state()` - Apply states
- ✅ `->for()` - BelongsTo relationships
- ✅ `->has()` - HasMany relationships
- ✅ `->afterCreating()` / `afterMaking()` - Callbacks
- ✅ `Factory` base class
- ✅ `FactoryManager` for registration
- ✅ `defineFactory()` helper function

### Seeder Features
- ✅ `WithoutModelEvents` support (via `Model.withoutEvents()`)
- ✅ Model factory integration
- ✅ Calling additional seeders

---

## **ADDITIONAL FEATURES**

### Database Transactions
- ✅ `DB::transaction()` - Run in transaction
- ✅ `DB::beginTransaction()` - Manual transaction
- ✅ `DB::commit()` / `rollBack()` - Commit/rollback
- ✅ `transactionLevel()` - Nesting level

### Query Logging
- ✅ `DB::enableQueryLog()` - Enable logging
- ✅ `DB::getQueryLog()` - Get query log
- ✅ `DB::flushQueryLog()` - Clear log
- ✅ Query event listeners
- ✅ `QueryLogger` class with statistics
- ✅ Slow query detection
- ✅ Pretty print query log

### Multiple Connections
- ✅ Multiple database connections
- ❌ `DB::connection()` - Switch connection
- ❌ Read/write connections
- ❌ Connection resolver

### Database Events
- ❌ `StatementPrepared` event
- ❌ `QueryExecuted` event
- ❌ `TransactionBeginning` event
- ❌ `TransactionCommitted` event
- ❌ `TransactionRolledBack` event

### Pagination
- ✅ `paginate()` - Paginated results
- ✅ `simplePaginate()` - Simple pagination
- ✅ `cursorPaginate()` - Cursor pagination
- ⚠️ Custom paginators

### Testing Support
- ✅ `RefreshDatabase` trait
- ✅ `DatabaseMigrations` trait
- ✅ `DatabaseTransactions` trait
- ⚠️ Database assertions

---

## **SUMMARY**

### Current GuruORM Coverage (v1.6.0):
- **Query Builder**: ~98% (nearly all core features + debugging + cursor pagination)
- **Eloquent ORM**: ~95% (comprehensive relationships, events, scopes, collections, pruning, timestamps control)
- **Schema Builder**: ~90% (30+ column types, modifiers, indexes, foreign keys, generated columns, hasIndex)
- **Migrations**: ~90% (CLI commands with --force/--step, events, migrator, batch tracking, up/down/shouldRun)
- **Seeding**: ~95% (db:seed command, DatabaseSeeder, call(), factory for()/has() relationships)
- **Testing**: ~70% (RefreshDatabase, DatabaseTransactions, DatabaseMigrations traits)
- **Overall**: ~91% complete

### ✅ Completed Features:
1. ✅ Complete WHERE clause variations (date, JSON, full-text, any/all/none, today-based)
2. ✅ Implement all relationships (hasMany, belongsTo, belongsToMany, hasOneThrough, hasManyThrough, polymorphic)
3. ✅ Implement eager loading (with, load, loadMissing, withCount, has, whereHas)
4. ✅ Add soft deletes support
5. ✅ Add model events and observers
6. ✅ Implement chunking and lazy loading
7. ✅ Add pagination support (paginate, simplePaginate, cursorPaginate)
8. ✅ Add transactions support
9. ✅ Enhanced schema builder with 30+ column types
10. ✅ Query scopes (global scopes, basic local scopes)
11. ✅ CLI commands (make:migration, make:seeder, make:factory)
12. ✅ Migration events system
13. ✅ Index management (create, drop, rename indexes)
14. ✅ Foreign key constraints (cascade, restrict, set null, no action)
15. ✅ Generated/computed columns (storedAs, virtualAs, generatedAs)
16. ✅ Query debugging tools (dump, dd, explain, toRawSql, cursor)
17. ✅ Enhanced Eloquent collections (find, fresh, contains, unique, diff, intersect)
18. ✅ Testing utilities (RefreshDatabase, DatabaseTransactions, DatabaseMigrations)
19. ✅ Query logging with statistics
20. ✅ Model factories with states and callbacks

### 🚧 Remaining Priority Items:
1. ⚠️ Complete migration execution (currently Migrator exists, need Schema integration)
2. ⚠️ Complete seeding system (DatabaseSeeder, call() method)
3. ❌ Database assertions for testing
4. ❌ Model pruning (Prunable trait)
5. ❌ Lateral joins (PostgreSQL, MySQL 8+)
6. ❌ JSON column operators (->)
7. ❌ Custom paginators
8. ❌ Connection resolver / switching
9. ❌ Read/write connection splitting
10. ❌ Database events (QueryExecuted, TransactionCommitted, etc.)

### 📊 Feature Completion by Category:
- Query Builder: 98% ⭐⭐⭐⭐⭐
- Eloquent Models: 95% ⭐⭐⭐⭐⭐ (up from 88%)
- Eloquent Collections: 85% ⭐⭐⭐⭐⭐
- Relationships: 95% ⭐⭐⭐⭐⭐
- Schema Builder: 90% ⭐⭐⭐⭐⭐ (up from 85%)
- Migrations: 90% ⭐⭐⭐⭐⭐ (up from 65%)
- Factories: 95% ⭐⭐⭐⭐⭐ (up from 70%)
- Seeding: 95% ⭐⭐⭐⭐⭐ (up from 40%)
- Query Logging: 95% ⭐⭐⭐⭐⭐
- Events & Observers: 85% ⭐⭐⭐⭐⭐ (up from 80%)
- Testing Support: 70% ⭐⭐⭐⭐

