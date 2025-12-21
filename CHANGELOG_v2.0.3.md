# GuruORM v2.0.3 - Eager Loading Bug Fix

**Release Date:** 21 December 2025

## 🐛 Bug Fixes

### Critical: Fixed Eager Loading with Inline Where Constraints

**Issue:** When using inline `.where()` constraints on `hasOne`, `morphOne`, `hasMany`, or `morphMany` relationships, eager loading would return incorrect results where all parent models got matched to the same child record.

**Example of the Bug:**
```javascript
// Model definition
primaryPhoto() {
  return this.hasOne(StorePhoto, 'store_id').where('is_primary', true);
}

// Query
const stores = await Store.query().with('primaryPhoto').get();
// BUG: All stores got the SAME primaryPhoto
```

**Root Cause:** 
The `addEagerConstraints()` method didn't filter out null/undefined keys, causing empty `whereIn()` clauses and incorrect SQL generation.

**Fix Applied:**
- **HasOne.ts**: Added `.filter(k => k != null)` to `addEagerConstraints()`
- **HasMany.ts**: Added `.filter(k => k != null)` to `addEagerConstraints()`
- **MorphOne.ts**: Added `.filter(k => k != null)` and conditional `whereIn`
- **MorphMany.ts**: Added `.filter(k => k != null)` and conditional `whereIn`
- **Builder.ts**: Reordered constraint application - eager constraints before user constraints

**Impact:** 
- ✅ Inline `.where()` on relationships now works correctly with eager loading
- ✅ Each parent model gets its own correctly matched child records
- ✅ No breaking changes - all existing code continues to work

**Files Modified:**
- `src/Eloquent/Relations/HasOne.ts`
- `src/Eloquent/Relations/HasMany.ts`
- `src/Eloquent/Relations/MorphOne.ts`
- `src/Eloquent/Relations/MorphMany.ts`
- `src/Eloquent/Builder.ts`

## 📦 Installation

```bash
npm install guruorm@2.0.3
```

## 🔄 Upgrade from 2.0.2

No breaking changes. Simply update your package.json:

```json
{
  "dependencies": {
    "guruorm": "^2.0.3"
  }
}
```

Then run `npm install`.
