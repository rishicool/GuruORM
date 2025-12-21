# GuruORM v2.0.6 Changelog

## Release Date
December 21, 2025

## Summary
Enhanced PostgreSQL raw SQL support with groupByRaw placeholder conversion and implemented Laravel-style query exception handling with detailed error logging.

## New Features

### Laravel-Style Query Exception Handling
- **Enhanced handleQueryException**: Implemented detailed error logging in base `Connection` class with SQL, bindings, connection info, and stack traces
  - **What Changed**: Query exceptions now include SQL, bindings, connection name, driver name, and original error
  - **Why**: Provides Laravel-level debugging experience for tracking down SQL errors
  - **Files Changed**: `src/Connection/Connection.ts`, `src/Connection/PostgresConnection.ts`

### PostgreSQL groupByRaw Placeholder Conversion
- **Fixed groupByRaw for PostgreSQL**: Added `compileGroups` override in `PostgresGrammar` to convert `?` placeholders to `$N` format
  - **What Changed**: Raw group by clauses now properly convert placeholders
  - **Why**: Prevents parameter mismatch errors when using `groupByRaw` with bindings
  - **Files Changed**: `src/Query/Grammars/PostgresGrammar.ts`

## Bug Fixes

### Vasuzex Model.save() Safety Check
- **Fixed pendingMutators undefined error**: Added safety check in `Model.save()` to initialize `pendingMutators` if undefined
  - **Root Cause**: Models fetched via `.where().first()` were missing instance property initialization
  - **Solution**: Added `if (!this.pendingMutators) { this.pendingMutators = []; }` safety check
  - **Files Changed**: `vasuzex-v2/framework/Database/Model.js`
  - **Impact**: Fixes "Cannot read properties of undefined (reading 'length')" error

## Technical Details

### Query Exception Enhancement
```typescript
// Before: Basic error, no context
throw error;

// After: Enhanced error with full context
const enhancedError = new Error(error.message);
enhancedError.name = 'QueryException';
(enhancedError as any).sql = query;
(enhancedError as any).bindings = bindings;
(enhancedError as any).originalError = error;

// Console output when logging enabled:
[GuruORM Query Exception] {
  message: "operator does not exist: character varying ~~* boolean",
  sql: "select * from products where name ILIKE $1 order by CASE WHEN name ILIKE ? THEN 1 ELSE 2 END",
  bindings: [true, '%pizza%', '%pizza%'],
  connection: 'default',
  driver: 'postgres',
  stack: '...'
}
```

### PostgreSQL groupByRaw Fix
```typescript
// Before: ? placeholders not converted
query.groupByRaw('DATE(created_at), store_id')
query.groupByRaw('CASE WHEN status = ? THEN 1 ELSE 2 END', ['active'])
// Generated SQL: group by CASE WHEN status = ? THEN 1 ELSE 2 END
// Result: Parameter mismatch error

// After: ? converted to $N
query.groupByRaw('CASE WHEN status = ? THEN 1 ELSE 2 END', ['active'])
// Generated SQL: group by CASE WHEN status = $1 THEN 1 ELSE 2 END
// Result: Correct parameter binding
```

### Vasuzex Model Safety Check
```javascript
// Before: Error when saving models from .first()
const searchQuery = await SearchQuery.where('query', 'pizza').first();
searchQuery.search_count += 1;
await searchQuery.save();
// Error: Cannot read properties of undefined (reading 'length')

// After: Works correctly
const searchQuery = await SearchQuery.where('query', 'pizza').first();
searchQuery.search_count += 1;
await searchQuery.save();
// Success: Model saved correctly
```

## Impact
- **Medium**: Fixes groupByRaw for PostgreSQL (uncommon usage)
- **High**: Provides detailed error logging for debugging SQL issues
- **Critical**: Fixes Model.save() crash for models fetched via query methods
- **Developer Experience**: Significantly improved debugging with detailed error context

## Migration Notes
No breaking changes. All existing code continues to work. New error handling is backwards compatible.

## Testing
Tested with:
- Product search API with orderByRaw, groupByRaw clauses
- SearchQuery model save operations
- PostgreSQL parameter binding with complex queries
- Error logging with query log enabled/disabled
- Model.save() after .where().first() operations

## Related Issues Fixed
- ✅ Fixed "Cannot read properties of undefined (reading 'length')" in Model.save()
- ✅ Fixed groupByRaw parameter mismatch for PostgreSQL
- ✅ Enhanced query exception handling with detailed context
- ✅ Improved debugging experience with SQL and binding logs

## Contributors
- Fixed by GitHub Copilot on behalf of development team
- Tested on neasto customer-api with SearchQuery and Product models

## Version Compatibility
- Requires Node.js >= 14.x
- PostgreSQL >= 10.x recommended
- MySQL >= 5.7 or MariaDB >= 10.2
- Compatible with TypeScript >= 4.x
- Works with vasuzex-v2 framework

## Upgrade Instructions
1. Update GuruORM to v2.0.6: `npm install guruorm@2.0.6`
2. No code changes required
3. Enable query logging for enhanced error details: `connection.enableQueryLog()`
4. Enjoy improved debugging and stability!
