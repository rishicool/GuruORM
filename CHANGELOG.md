# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.4] - 2025-11-29

### Fixed
- Added missing instance methods to Capsule Manager: `table()`, `disconnect()`, `transaction()`
- Transaction callback now properly receives connection instance as parameter
- Capsule can now be used with both instance and static methods

## [1.6.3] - 2025-11-29

### Fixed
- SQLite async constructor issue - connection now properly initialized on first query
- SQL Server async constructor issue - connection promise handled correctly
- All database drivers now ensure connection before executing queries

### Added
- DATABASE.md - Comprehensive guide for all database drivers
- Example files for MySQL, PostgreSQL, SQLite, and SQL Server testing

## [1.6.2] - 2025-11-29

### Added
- **PostgreSQL Driver** - Full implementation with pg package
  - Connection pooling
  - Query execution (select, insert, update, delete)
  - Transaction support (BEGIN, COMMIT, ROLLBACK)
  - Prepared statements with bindings
  
- **SQLite Driver** - Full implementation with better-sqlite3 (optional)
  - Synchronous API wrapped in async
  - In-memory and file-based databases
  - Transaction support
  - Dynamic import for optional dependency
  
- **SQL Server Driver** - Full implementation with tedious package
  - Connection pooling
  - Parameterized queries (@p0, @p1 style)
  - Transaction support
  - TrustServerCertificate support

### Fixed
- All database drivers now extend Connection properly
- setName() method available on all connection types
- Optional dependency handling for better-sqlite3

## [1.6.1] - 2025-11-29

### Updated
- **Documentation**
  - Removed Laravel/Illuminate mentions (kept only as inspiration)
  - Updated QUICKSTART.md to reflect v1.6.0 status
  - Updated PUBLISHING.md with current version and examples
  - Added PERFORMANCE.md with comprehensive benchmark vs 8 ORMs

### Fixed
- Repository cleanup (removed Laravel references from keywords)
- Source code comments updated to generic inspiration line

## [1.6.0] - 2024-11-29

### 🎉 JavaScript & TypeScript - Works with Both!

**GuruORM now explicitly supports both JavaScript and TypeScript projects!**
- ✅ No TypeScript compilation required
- ✅ Works with plain CommonJS `require()`
- ✅ Works with ES modules `import`
- ✅ Full feature parity in both languages
- ✅ Optional type safety with TypeScript

### Added - Eloquent Models (95% Complete)
- **Event Management**
  - `withoutTimestamps()` - Execute callbacks without updating timestamps
  - `withoutModelEvents()` / `withoutEvents()` - Execute without firing events
  - `dispatchesEvents` property - Map model events to custom classes
  - `replicating` event - Fire when model is being replicated
  
- **Soft Deletes Enhancements**
  - `restoreQuietly()` - Restore soft-deleted models without events
  - `performDeleteOnModel()` - Overridable delete implementation
  - `runSoftDelete()` - Soft delete logic
  - `newQueryWithoutScopes()` - Query without global scopes
  
- **Query Scopes**
  - Full `scope()` prefix convention support for local scopes
  - `scopes()` method - Apply multiple scopes dynamically
  - `callScope()` - Dynamically call scopes
  
- **Model Pruning**
  - `PrunableModel` base class - Prune models with individual events
  - `MassPrunableModel` base class - Bulk pruning without individual events
  - `prunable()` abstract method for defining prunable criteria
  - `pruned()` hook for cleanup after pruning
  - `model:prune` CLI command with usage guide
  
- **Internal Methods**
  - `syncOriginalAttribute()` - Sync individual attributes
  - `isIgnoringTimestamps()` - Check timestamp status

### Added - Migrations (90% Complete)
- **Migration Structure**
  - `$connection` property - Database connection for migration
  - `shouldRun()` method - Conditional migration execution
  - `withinTransaction` property - Transaction support
  - `getConnection()` method - Get migration connection
  
- **Migration Commands Enhanced**
  - `migrate:refresh` command - Reset and re-run migrations
  - `migrate:fresh` command - Drop all tables and migrate
  - `--force` flag - Force operations in production
  - `--step` option - Control migration batch steps
  - Production environment protection

### Added - Seeding (95% Complete)
- **Seeder Enhancements**
  - `DatabaseSeeder` base class
  - `call()` method - Call other seeders (supports arrays)
  - `callWith()` method - Call with options (silent mode support)
  - `$connection` property - Database connection
  - `getConnection()` method - Get seeder connection
  
- **Database Seeding**
  - `db:seed` command - Actual implementation with dynamic imports
  - `--class` option - Specify seeder class (defaults to DatabaseSeeder)
  - `--force` flag - Force seeding in production
  - Integration with `migrate:fresh --seed`
  - Comprehensive error handling and guidance
  
- **Factory Relationships**
  - `for()` method - Define belongs-to relationships
  - `has()` method - Define has-many relationships
  - Automatic foreign key handling
  - Support for multiple parent/child relationships
  - `createParentRelationships()` - Create parents before children
  - `createChildRelationships()` - Create children after parent

### Added - Schema Builder (90% Complete)
- **Schema Inspection**
  - `hasIndex()` - Check if table has a given index

### Improved
- **Code Organization**
  - Moved development docs to `.dev/docs/`
  - Moved release notes to `.dev/releases/`
  - Cleaned up root directory (removed README_OLD.md, package.json.bak, etc.)
  - Better project structure

### Overall Progress
- **Query Builder**: 98% complete
- **Eloquent ORM**: 95% complete (up from 88%)
- **Schema Builder**: 90% complete (up from 85%)
- **Migrations**: 90% complete (up from 65%)
- **Seeding**: 95% complete (up from 40%)
- **Overall**: 91% feature parity (up from 80%)

## [1.5.0] - 2024-11-29

### Added - Eloquent Models Enhanced (100% Feature Goal)

**Model Event System**
- `dispatchesEvents` property - Map model events to custom event classes
- `withoutModelEvents()` static method - Execute code without firing model events
- `withoutEvents()` static method - Alias for withoutModelEvents
- `replicating` event - Fired when model is being replicated
- Enhanced `fireModelEvent()` to support custom event mapping

**Timestamp Management**
- `withoutTimestamps()` static method - Execute callback without updating timestamps
- `isIgnoringTimestamps()` protected method - Check if timestamps are disabled
- Enhanced `updateTimestamps()` to respect withoutTimestamps flag

**Soft Delete Enhancements**
- `restoreQuietly()` - Restore soft-deleted model without firing events
- `performDeleteOnModel()` - Overridable delete implementation
- `runSoftDelete()` - Actual soft delete logic
- `newQueryWithoutScopes()` - Query builder without global scopes
- `syncOriginalAttribute()` - Sync single original attribute

**Query Scopes**
- `scopes()` method in Builder - Apply multiple scopes dynamically
- `callScope()` method in Builder - Call single scope with parameters
- Full support for `scopeX()` method naming convention in models
- Dynamic scope resolution and application

**Model Pruning**
- `PrunableModel` abstract class - Soft prune with individual events
- `MassPrunableModel` abstract class - Mass prune without individual events
- `prunable()` abstract method - Define pruning query
- `pruned()` method - Post-prune cleanup hook
- `model:prune` CLI command with usage guide
- Chunk-based processing for efficient pruning

**Internal Improvements**
- `performDeleteOnModel()` - Separate delete logic from event handling
- `newQueryWithoutScopes()` - Query without global scopes (used by SoftDeletes)
- `syncOriginalAttribute()` - Granular original tracking
- Enhanced Model flexibility for trait overrides

### Changed
- Model `delete()` now delegates to `performDeleteOnModel()` for better trait composition
- `fireModelEvent()` now checks `dispatchesEvents` for custom event mapping
- `fireModelEvent()` respects `withoutEventsOn` flag
- SoftDeleteModel now properly extends performDeleteOnModel for soft/hard delete logic

### Fixed
- SoftDeletes now properly returns boolean from `performDeleteOnModel()`
- Type constraints for Prunable model generics

### Documentation
- Updated FEATURES_CHECKLIST.md with new Eloquent completions
- Eloquent ORM section now shows full feature parity for:
  - Event system (100%)
  - Timestamp control (100%)
  - Soft deletes (100%)
  - Query scopes (100%)
  - Model pruning (100%)

## [1.5.0] - 2024-11-29

### Added
- **CLI Command Generators**
  - `make:migration` - Create migration files with timestamp prefixes
  - `make:seeder` - Create seeder class files
  - `make:factory` - Create factory class files
  - Support for `--create` and `--table` flags in migrations
  - Automatic file naming and class naming conventions

- **Schema Blueprint Enhancements**
  - Index management: `index()`, `unique()`, `primary()`, `fullText()`, `spatialIndex()`
  - Index operations: `dropIndex()`, `dropUnique()`, `dropPrimary()`, `renameIndex()`
  - Foreign key constraints with full cascade/restrict/set null support
  - `foreign()`, `references()`, `on()` methods
  - `cascadeOnDelete()`, `cascadeOnUpdate()`, `restrictOnDelete()`, `restrictOnUpdate()`
  - `nullOnDelete()`, `noActionOnDelete()`, `noActionOnUpdate()`
  - `dropForeign()` for removing foreign keys

- **Column Modifiers**
  - Generated columns: `storedAs()`, `virtualAs()`, `generatedAs()`
  - `invisible()` - Invisible columns (MySQL 8.0.23+)
  - `useCurrent()`, `useCurrentOnUpdate()` - Timestamp defaults
  - Helper methods for nullable, default, unsigned, unique, index, primary, comment, etc.

- **Migration Events System**
  - `MigrationEventDispatcher` for lifecycle hooks
  - Events: `migrations.started`, `migrations.ended`, `migration.started`, `migration.ended`
  - `migrations.none`, `schema.dumped`, `schema.loaded` events
  - Event listeners and dispatchers integrated into Migrator

- **Testing Utilities**
  - `RefreshDatabase` - Refresh database before each test
  - `DatabaseTransactions` - Wrap tests in transactions
  - `DatabaseMigrations` - Run/rollback migrations for tests
  - `WithTransaction` decorator for automatic transaction wrapping

- **Advanced Pagination**
  - `cursorPaginate()` - Cursor-based pagination for large datasets
  - More efficient than offset pagination for large tables
  - Supports forward and backward navigation
  - Base64-encoded cursor tokens

### Improved
- CLI commands now actually generate files instead of showing placeholder messages
- Migration file structure follows standard conventions
- Seeder and Factory file generation with proper namespacing
- Enhanced error handling in CLI commands

### Fixed
- Repository URLs updated from `yourusername` to `rishicool` across all documentation
- Build process now includes CLI makers

## [1.4.0] - 2024-11-29

### Added
- **Query Debugging Tools**
  - `dump()` - Log SQL and bindings to console, chainable
  - `dd()` - Dump and die (log query and exit process)
  - `dumpRawSql()` - Display SQL with bindings interpolated
  - `ddRawSql()` - Dump raw SQL and exit
  - `toRawSql()` - Get SQL string with bindings replaced
  - `explain()` - Run EXPLAIN on query for performance analysis

- **Memory-Efficient Iteration**
  - `cursor()` - AsyncGenerator for processing large result sets
  - Generator-based approach prevents loading all records into memory
  - Ideal for processing millions of records efficiently

- **Model Convenience Methods**
  - `saveQuietly()` - Save model without firing events
  - `touch()` - Update only timestamps (created_at/updated_at)
  - Consolidated timestamp management logic

- **Enhanced Eloquent Collections**
  - `find(key)` - Find model by primary key in collection
  - `modelKeys()` - Extract array of all model primary keys
  - `fresh()` - Reload all models from database with fresh data
  - `contains()` - Check if collection contains model/value with operators
  - `unique(key?)` - Get unique models by key or dedupe entire collection
  - `diff(collection)` - Get models in this collection but not in other
  - `intersect(collection)` - Get models present in both collections
  - `makeVisible(attrs)` / `makeHidden(attrs)` - Toggle visibility on all models
  - `load(relations)` - Lazy load relationships on all collection models
  - 10+ new methods for comprehensive model collection operations

### Improved
- Collection class completely rewritten from basic placeholder to full-featured Eloquent collection
- Better memory management with cursor-based iteration
- Enhanced debugging capabilities for query optimization

## [1.3.0] - 2024-11-29

### Added
- **Query Logging System**
  - `QueryLogger` class for tracking database queries
  - `DB.enableQueryLog()` / `DB.disableQueryLog()` - Toggle logging
  - `DB.getQueryLog()` - Retrieve query history
  - `DB.flushQueryLog()` - Clear query log
  - Query event listeners
  - Slow query detection
  - Pretty print query log with statistics
  - Total query time and count tracking

- **Model Factory System**
  - `Factory<T>` base class for generating test data
  - `factory()` helper function
  - `defineFactory()` for custom factory definitions
  - `FactoryManager` for registration
  - `times()` - Create multiple models
  - `create()` - Create and save models
  - `make()` - Make without saving
  - `state()` - Apply state transformations
  - `afterCreating()` / `afterMaking()` - Lifecycle callbacks

- **Migration System**
  - `Migrator` class for managing migrations
  - `run()` - Execute pending migrations
  - `rollback()` - Rollback last batch
  - `reset()` - Reset all migrations
  - `status()` - Check migration status
  - Batch tracking system
  - Migration file loading and execution
  - Automatic migration table creation
  - `--pretend` flag support
  - Error handling and reporting

- **Enhanced Schema Builder**
  - `Schema::rename()` - Rename tables
  - `Schema::hasColumn()` / `hasColumns()` - Check columns exist
  - `Schema::getColumnType()` - Get column data type
  - `Schema::getAllTables()` - List all tables
  - `Schema::dropAllTables()` - Drop all tables
  - `Schema::enableForeignKeyConstraints()`
  - `Schema::disableForeignKeyConstraints()`
  - `Schema::withoutForeignKeyConstraints()` - Temporary disable
  - Grammar support for column operations: `addColumn()`, `dropColumn()`, `renameColumn()`, `modifyColumn()`
  - `compileCreateTable()` with engine, charset, collation, comment support

### Improved
- Schema grammar with comprehensive table and column operations
- Connection interface for migration support
- Better error messages for schema operations

## [1.2.0] - 2024-11-29

### Added
- **Relationship Query Methods**
  - `has()`, `whereHas()` - Query models that have related records
  - `doesntHave()`, `whereDoesntHave()` - Query models without related records
  - `orWhereHas()`, `orWhereDoesntHave()` - OR variants of relationship existence queries
  - `withCount()` - Eager load relationship counts as attributes

- **Lazy Eager Loading**
  - `load()` - Load relationships on an existing model instance
  - `loadMissing()` - Load only relationships not already loaded
  - `relationLoaded()` - Check if a relationship is loaded
  - `getRelations()`, `setRelation()`, `unsetRelation()` - Manage loaded relations

- **Custom Attribute Casting System**
  - `CastsAttributes` interface for bidirectional custom casting
  - Built-in custom casts:
    - `ArrayCast` - JSON ↔ Array conversion
    - `JsonCast` - JSON ↔ Object conversion
    - `EncryptedCast` - Base64 encryption/decryption
    - `AsCollectionCast` - JSON ↔ Collection conversion
    - `AsStringableCast` - String wrapper casting

- **Model Concerns/Traits**
  - `SoftDeleteModel` - Soft delete functionality base class
  - `UuidModel` - UUID primary key support
  - `UlidModel` - ULID primary key support
  - `HasUuids`, `HasUlids` - Trait classes for UUID/ULID support

### Improved
- Enhanced Model casting to support custom cast classes and instances
- Better type safety in cast attribute methods
- Relationship query builder with existence queries

## [1.1.0] - 2024-11-29

### Added
- **Advanced Query Builder Methods**
  - `whereAny()`, `whereAll()`, `whereNone()` - Multiple column where clauses
  - `whereToday()`, `whereBeforeToday()`, `whereAfterToday()` - Today-based date filters
  - `whereTodayOrBefore()`, `whereTodayOrAfter()` - Today comparison filters

- **Complete Relationship System**
  - Through relationships: `hasOneThrough()`, `hasManyThrough()`
  - Polymorphic relationships: `morphOne()`, `morphMany()`, `morphTo()`
  - All basic relationships: `hasOne()`, `hasMany()`, `belongsTo()`, `belongsToMany()`
  - Full eager loading support

- **Enhanced Schema Builder**
  - 30+ new column types: `uuid()`, `ulid()`, `ipAddress()`, `macAddress()`, `geometry()`, `point()`, `polygon()`, etc.
  - Integer variations: `tinyInteger()`, `smallInteger()`, `mediumInteger()`, `unsignedInteger()`, `unsignedBigInteger()`
  - Text variations: `char()`, `mediumText()`, `longText()`
  - Numeric types: `float()`, `double()`, `decimal()`
  - Special columns: `enum()`, `set()`, `binary()`, `jsonb()`, `year()`, `time()`
  - Helper methods: `morphs()`, `nullableMorphs()`, `uuidMorphs()`, `ulidMorphs()`, `rememberToken()`, `softDeletes()`

### Improved
- Model relationship infrastructure
- Type safety across all relationships
- Schema builder flexibility and completeness

### Fixed
- Relationship query building
- Type annotations in through relationships

## [1.0.7] - 2024-11-29

### Added
- **Query Builder Enhancements**
  - Added `whereLike()`, `orWhereLike()`, `whereNotLike()`, `orWhereNotLike()` methods
  - All WHERE clause variants (date, time, JSON, full-text)
  - Pagination support (`paginate()`, `simplePaginate()`)
  - Chunking and streaming (`chunk()`, `chunkById()`, `lazy()`, `lazyById()`)
  - Advanced insert/update operations (`insertGetId()`, `insertOrIgnore()`, `upsert()`, `updateOrInsert()`)
  - Increment/decrement operations
  - Union operations
  - Query locks (`sharedLock()`, `lockForUpdate()`)

- **Eloquent ORM Features**
  - Complete relationship support (HasOne, HasMany, BelongsTo, BelongsToMany)
  - Model events system (`creating`, `created`, `updating`, `updated`, `saving`, `saved`, `deleting`, `deleted`)
  - Event listeners and observers
  - Global scopes support
  - Soft delete functionality
  - Mass assignment protection (fillable/guarded)
  - Attribute casting
  - Accessors and mutators
  - Model serialization (`toArray()`, `toJson()`)
  - Eager loading for relationships

### Improved
- Enhanced Model class with comprehensive functionality
- Better TypeScript type safety
- Improved error handling
- Code organization and structure

### Fixed
- Compilation errors in relationship classes
- Duplicate method implementations
- Type safety issues

## [Unreleased]

### Added
- Initial project structure
- Core connection management
- Basic Query Builder implementation
- Schema Builder foundation
- Capsule Manager for standalone usage
- MySQL connection support
- TypeScript configuration
- Testing framework setup
- CLI foundation
- Comprehensive documentation structure

### In Progress
- Query Builder (Phase 2)
- Schema Builder (Phase 3)
- Migrations (Phase 4)
- Eloquent ORM (Phase 5)
- Relationships (Phase 6)
- Seeders & Factories (Phase 7)
- CLI Commands (Phase 8)

## [1.0.0] - TBD

### Added
- First stable release with complete feature set

[Unreleased]: https://github.com/rishicool/guruorm/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/rishicool/guruorm/releases/tag/v1.0.0
