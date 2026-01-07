# Changelog - GuruORM v2.0.15

## Version 2.0.15 (2026-01-07)

### 🐛 Bug Fixes

#### Seeder Tracking & Legacy Table Migration
- **Fixed critical issue**: Seeder tracking now properly handles legacy table structures
- **Automatic migration**: Existing `seeders` tables are automatically migrated to the new format
- **Backward compatibility**: Supports both old (`run_at` column) and new (`batch` column) table structures
- **Name normalization**: Seeder names are now normalized (`.js` extension removed) for consistency
- **Dual lookup**: Checks for both legacy (with `.js`) and normalized (without `.js`) seeder names

### 🔄 Changes

#### SeederRunner Improvements
1. **createSeedersTable()**: Now includes migration logic for legacy tables
   - Adds `batch` column if missing
   - Normalizes seeder names (removes `.js` extension)
   - Adds unique constraint on `seeder` column
   - Sets existing seeders to batch 1 by default

2. **migrateLegacySeedersTable()**: New method to handle table migration
   - Detects legacy table structure with `run_at` column
   - Migrates to new structure with `batch` column
   - Normalizes all existing seeder names
   - Handles duplicates gracefully

3. **hasSeederRun()**: Enhanced backward compatibility
   - Checks for normalized name first
   - Falls back to legacy name (with `.js`) if not found
   - Ensures no seeders are missed during transition

4. **logSeeder()**: Ensures consistency
   - Always logs normalized seeder names
   - Prevents duplicate entries
   - Checks before inserting

5. **getNextBatchNumber()**: Improved error handling
   - Gracefully handles missing `batch` column
   - Returns 1 if query fails (safe default)

### 📋 Technical Details

**Problem Solved:**
- Legacy seeder tracking tables used `run_at` timestamp column
- Seeder names were stored with `.js` extension
- GuruORM expected `batch` integer column and names without extension
- This mismatch caused:
  - Seeder tracking to fail
  - Duplicate insert attempts on every deployment
  - Database constraint violations

**Solution Implemented:**
- Automatic detection and migration of legacy tables
- Support for both old and new formats simultaneously
- Smooth transition without data loss
- Zero-downtime migration

### 🚀 Deployment Impact

**Before this fix:**
- Deployments failed with "duplicate key value violates unique constraint" errors
- Seeders attempted to re-insert existing data
- Required manual database intervention

**After this fix:**
- Deployments complete successfully
- Already-run seeders are properly skipped
- New seeders run automatically
- No manual intervention needed

### ⚠️ Breaking Changes
None. This release is fully backward compatible.

### 📝 Migration Notes

**For projects with existing seeder tracking:**
1. The migration happens automatically on first run
2. No manual steps required
3. Existing seeder records are preserved
4. Names are automatically normalized

**For new projects:**
- Creates table with proper structure from the start
- No migration needed

### 🔍 Testing

Tested on:
- PostgreSQL with legacy `run_at` column structure
- 45 existing seeders successfully migrated
- All seeders properly skipped on subsequent runs
- Production deployment verified successful

### 📦 Files Changed
- `src/CLI/SeederRunner.ts`: Core seeder tracking logic
- `package.json`: Version bump to 2.0.15
- `dist/`: Compiled JavaScript output

### 🙏 Credits
Fixed critical production deployment issue affecting seeder tracking and preventing successful deployments.
