# GuruORM String-Based Relations - Feature Proposal

## Problem Statement

**Current Limitation:** GuruORM forces developers to import every related model class, reducing flexibility:

```javascript
// ❌ Current: Must import everything
import Product from './Product.js';
import Brand from './Brand.js';
import Category from './Category.js';
import Unit from './Unit.js';
import ProductVariant from './ProductVariant.js';

export default class Product extends Model {
    brand() { return this.belongsTo(Brand); }
    category() { return this.belongsTo(Category); }
    variants() { return this.hasMany(ProductVariant); }
}
```

**Desired Flexibility:** Allow optional string-based relations like Laravel:

```javascript
// ✅ Desired: Clean, no circular import issues
export default class Product extends Model {
    brand() { return this.belongsTo('Brand'); }
    category() { return this.belongsTo('Category'); }
    variants() { return this.hasMany('ProductVariant'); }
}
```

---

## Why This Feature Is Needed

### 1. **Circular Import Hell**

Large projects have complex model relationships:

```javascript
// Order.js
import User from './User.js';
import Product from './Product.js';
import Store from './Store.js';

// User.js
import Order from './Order.js';
import Review from './Review.js';
import Wishlist from './Wishlist.js';

// Product.js
import Order from './Order.js';  // ❌ Circular!
import Review from './Review.js';
import Wishlist from './Wishlist.js';
```

**With strings:**
```javascript
// Order.js - no imports needed!
orders() { return this.hasMany('Order'); }
```

### 2. **Lazy Loading**

Current approach loads ALL model files even if not used:

```javascript
// Want to use Product model
import Product from './Product.js';

// But Product.js imports:
import Brand from './Brand.js';
import Category from './Category.js';
import ProductVariant from './ProductVariant.js';
// ... and so on

// Result: 100+ model files loaded for one query!
```

**With strings:**
```javascript
// Only loads Product model
const product = await Product.find(1);

// Loads Brand only when needed
const brand = await product.brand().get();
```

### 3. **Developer Experience**

Laravel developers expect this to work:

```php
// Laravel (PHP)
public function brand() {
    return $this->belongsTo(Brand::class);  // or 'App\Models\Brand'
}
```

GuruORM claims "Laravel-inspired" but lacks this basic feature.

### 4. **File Size**

With class imports, bundle size increases:

```javascript
// main.js includes:
- Product.js (5kb)
  - Brand.js (4kb)
    - Product.js (already loaded)
  - Category.js (4kb)
    - Parent.js (3kb)
      - Children.js (loaded)
  - ProductVariant.js (6kb)
    - Product.js (loaded)
    - Unit.js (3kb)
    
// Total: 25kb+ for one model!
```

**With lazy loading:**
```javascript
// main.js includes:
- Product.js (5kb)

// Load others only when used
// Total: 5kb initially
```

---

## Proposed Implementation

### Solution 1: Global Model Registry

```typescript
// src/Eloquent/Model.ts

export class Model {
  // Model registry (already exists for morphMap!)
  protected static modelRegistry: Record<string, typeof Model> = {};
  
  /**
   * Register a model class
   */
  static register(name: string, modelClass: typeof Model): void {
    Model.modelRegistry[name] = modelClass;
  }
  
  /**
   * Get a registered model
   */
  static getModel(name: string): typeof Model | undefined {
    return Model.modelRegistry[name];
  }
  
  /**
   * Resolve model from string or class
   */
  protected resolveModel(related: typeof Model | string): typeof Model {
    if (typeof related === 'string') {
      const modelClass = Model.getModel(related);
      if (!modelClass) {
        throw new Error(
          `Model "${related}" not found. Did you forget to register it?\n` +
          `Add: Model.register('${related}', ${related})`
        );
      }
      return modelClass;
    }
    return related;
  }
  
  /**
   * Auto-register on boot
   */
  protected boot(): void {
    const constructor = this.constructor as typeof Model;
    
    // Auto-register for string lookups
    Model.register(constructor.name, constructor);
    
    // Also register for morphTo (existing)
    Model.morphMap[constructor.name] = constructor;
  }
  
  /**
   * Define belongsTo with string or class support
   */
  belongsTo(
    related: typeof Model | string, 
    foreignKey?: string, 
    ownerKey?: string
  ): any {
    const { BelongsTo } = require('./Relations/BelongsTo');
    
    // ✅ Resolve string to class
    const relatedClass = this.resolveModel(related);
    const instance = new relatedClass();
    
    foreignKey = foreignKey || this.snake(instance.constructor.name) + '_id';
    ownerKey = ownerKey || instance.getKeyName();

    return new BelongsTo(instance.newQuery(), this, foreignKey, ownerKey);
  }
  
  // Same for hasMany, belongsToMany, etc.
}
```

### Solution 2: Dynamic Import (Lazy Loading)

```typescript
// src/Eloquent/Model.ts

export class Model {
  protected static modelPaths: Record<string, string> = {};
  
  /**
   * Register model path for lazy loading
   */
  static registerPath(name: string, path: string): void {
    Model.modelPaths[name] = path;
  }
  
  /**
   * Lazy load model from string
   */
  protected async resolveModelAsync(related: typeof Model | string): Promise<typeof Model> {
    if (typeof related === 'string') {
      const path = Model.modelPaths[related];
      if (!path) {
        throw new Error(`Model path for "${related}" not found`);
      }
      
      // Dynamic import - only loads when needed!
      const module = await import(path);
      return module.default;
    }
    return related;
  }
}

// Usage:
Model.registerPath('Brand', './models/Brand.js');
Model.registerPath('Product', './models/Product.js');

// Now this works:
const brand = await product.brand().get();  // Loads Brand.js only now
```

### Solution 3: Convention-Based Auto-Discovery

```typescript
// src/Eloquent/Model.ts

export class Model {
  protected static modelDirectory = './models';
  
  /**
   * Auto-discover model by convention
   */
  protected resolveModel(related: typeof Model | string): typeof Model {
    if (typeof related === 'string') {
      // Try to import from conventional path
      try {
        const path = `${Model.modelDirectory}/${related}.js`;
        const module = require(path);
        return module.default;
      } catch (err) {
        throw new Error(
          `Model "${related}" not found at ${path}\n` +
          `Make sure the file exists or use direct import.`
        );
      }
    }
    return related;
  }
}

// Usage (no registration needed!):
// Just name your files: models/Product.js, models/Brand.js
belongsTo('Brand')  // Auto-finds ./models/Brand.js
```

---

## Benefits

| Feature | Class Import | String-Based |
|---------|-------------|--------------|
| **Type Safety** | ✅ Full | ⚠️ Runtime only |
| **Autocomplete** | ✅ Yes | ❌ No |
| **Circular Imports** | ⚠️ Can break | ✅ No issues |
| **Lazy Loading** | ❌ Loads all | ✅ Load on demand |
| **Bundle Size** | ❌ Large | ✅ Smaller |
| **Laravel-like** | ❌ No | ✅ Yes |
| **Flexibility** | ⚠️ Limited | ✅ High |

---

## Hybrid Approach (Best of Both Worlds)

**Allow BOTH class and string:**

```typescript
// Option 1: Class (type-safe, autocomplete)
import Brand from './Brand.js';
belongsTo(Brand, 'brand_id')

// Option 2: String (flexible, no imports)
belongsTo('Brand', 'brand_id')

// Option 3: Callback (lazy, type-safe)
belongsTo(() => require('./Brand.js').default, 'brand_id')
```

**TypeScript signature:**

```typescript
belongsTo(
  related: typeof Model | string | (() => typeof Model),
  foreignKey?: string,
  ownerKey?: string
): any
```

---

## Migration Path

### Phase 1: Add String Support (Backward Compatible)

```typescript
// Old code still works
import Brand from './Brand.js';
belongsTo(Brand)  // ✅ Works

// New code can use strings
belongsTo('Brand')  // ✅ Also works
```

### Phase 2: Documentation

```markdown
# Relations

## Option 1: Class Import (Recommended for TypeScript)

```typescript
import Brand from './Brand';
belongsTo(Brand, 'brand_id')
```

**Pros:** Type safety, autocomplete
**Cons:** All models loaded upfront

## Option 2: String Reference (Recommended for JavaScript)

```javascript
belongsTo('Brand', 'brand_id')
```

**Pros:** No circular imports, lazy loading
**Cons:** No autocomplete, runtime errors
```

### Phase 3: Developer Choice

Let developers choose based on their needs:

**Small projects (< 20 models):**
- Use class imports (type safety)

**Large projects (100+ models):**
- Use strings (performance, flexibility)

**Hybrid projects:**
- Use classes for core models
- Use strings for rarely-used models

---

## Addressing TypeScript Concerns

### Concern 1: "Breaks Type Safety"

**Solution:** Use generics and type assertions:

```typescript
class Model {
  belongsTo<T extends Model = any>(
    related: string,
    foreignKey?: string
  ): BelongsTo<T> {
    // ...
  }
}

// Usage with type hint:
brand(): BelongsTo<Brand> {
  return this.belongsTo<Brand>('Brand');
}

// Still get autocomplete:
const brand = await product.brand().first();
brand.name  // ✅ TypeScript knows it's Brand
```

### Concern 2: "Runtime Errors"

**Solution:** Add development-time checks:

```typescript
// In development mode
if (process.env.NODE_ENV === 'development') {
  // Verify all string relations exist
  Model.validateRelations();
}
```

### Concern 3: "No Refactoring Support"

**Solution:** Use constants:

```typescript
// models/index.ts
export const MODEL_NAMES = {
  Brand: 'Brand',
  Product: 'Product',
  Category: 'Category'
} as const;

// Product.ts
import { MODEL_NAMES } from './index';

belongsTo(MODEL_NAMES.Brand)  // ✅ Refactoring works
```

---

## Comparison with Other ORMs

### Sequelize (JavaScript)

```javascript
// Supports BOTH!
Product.belongsTo(Brand);  // Class
Product.belongsTo('Brand');  // String
```

### TypeORM (TypeScript)

```typescript
// Uses callbacks for lazy loading
@ManyToOne(() => Brand)  // ✅ Lazy + type-safe
brand: Brand;
```

### Prisma (TypeScript)

```typescript
// Schema-based (different approach)
model Product {
  brand Brand @relation(fields: [brandId], references: [id])
}
```

**GuruORM should match Sequelize** - support both approaches.

---

## Recommended Action

### Immediate (v1.16.0)

1. **Add `Model.register()` method**
2. **Modify relation methods to accept strings**
3. **Auto-register models in `boot()`**
4. **Update documentation**

### Code Changes Required

**File:** `src/Eloquent/Model.ts`

```typescript
// Add after line 11
protected static modelRegistry: Record<string, typeof Model> = {};

// Add after line 176
Model.register(constructor.name, constructor);

// Add new methods
static register(name: string, modelClass: typeof Model): void {
  Model.modelRegistry[name] = modelClass;
}

static getModel(name: string): typeof Model | undefined {
  return Model.modelRegistry[name];
}

protected resolveModel(related: typeof Model | string): typeof Model {
  if (typeof related === 'string') {
    const modelClass = Model.getModel(related);
    if (!modelClass) {
      throw new Error(`Model "${related}" not registered. Import it first.`);
    }
    return modelClass;
  }
  return related;
}

// Modify line 1727
belongsTo(related: typeof Model | string, foreignKey?: string, ownerKey?: string): any {
  const { BelongsTo } = require('./Relations/BelongsTo');
  const relatedClass = this.resolveModel(related);  // ✅ Resolve string
  const instance = new relatedClass();
  // ... rest unchanged
}
```

**Estimated work:** 2-3 hours
**Breaking changes:** None (backward compatible)
**Risk:** Low (morphMap already works this way)

---

## Conclusion

**Current State:**
- ❌ Inflexible (class imports only)
- ❌ Circular import issues
- ❌ Large bundle sizes
- ❌ Not truly "Laravel-inspired"

**With String Support:**
- ✅ Flexible (developer choice)
- ✅ No circular imports
- ✅ Lazy loading possible
- ✅ Matches Laravel philosophy

**Recommendation:** **Implement string-based relations in v1.16.0**

This is NOT a breaking change - it's a feature addition that makes GuruORM more flexible and Laravel-like.

---

**Priority:** 🔴 **HIGH** - This is a common pain point for developers coming from Laravel.

**Complexity:** 🟢 **LOW** - Similar code already exists for `morphMap`.

**Value:** 🟢 **HIGH** - Makes GuruORM competitive with Sequelize and more Laravel-like.
