# Phase 2: Collection Enhancement

**Duration:** 7 days + 2 days testing  
**Priority:** HIGH  
**Version:** 2.1.0-beta.2

---

## Overview

Phase 2 implements all missing Laravel Collection methods to achieve 100% parity. Currently, GuruORM Collection has ~40% of Laravel's methods. This phase adds the remaining 30+ methods.

**Current Collection Coverage:** ~40% (20/50+ methods)  
**Target Collection Coverage:** 100% (50+ methods)

---

## Laravel Collection Method Inventory

### Currently Implemented in GuruORM ✅
- all(), avg(), chunk(), collapse(), contains(), count()
- diff(), each(), except(), first(), flatten(), flip()
- forget(), get(), groupBy(), isEmpty(), isNotEmpty()
- last(), map(), max(), min(), only()
- pluck(), pop(), push(), pull(), reduce()
- reject(), reverse(), shuffle(), skip(), slice()
- sort(), sortBy(), sortDesc(), sum(), take()
- toArray(), toJSON(), unique(), where(), zip()

### Missing Methods to Implement ❌

#### High Priority (Core Functionality)
1. **sole()** - Get single item, throw if zero or multiple
2. **ensure()** - Ensure all items are of given type
3. **firstWhere()** - First item matching conditions
4. **value()** - Get single column value from first item
5. **lazy()** - Create lazy collection
6. **collect()** - Static constructor
7. **make()** - Already exists, needs verification
8. **wrap()** - Already exists, needs verification

#### Medium Priority (Developer Experience)
9. **doesntContain()** - Inverse of contains
10. **containsStrict()** - Strict type checking
11. **containsOneItem()** - Check if exactly one item
12. **pipe()** - Pass collection to callback
13. **tap()** - Tap into collection
14. **when()** - Conditional execution (already exists in where?)
15. **whenEmpty()** - Execute when empty
16. **whenNotEmpty()** - Execute when not empty
17. **unless()** - Conditional execution (inverse of when)
18. **filter()** - Already exists, needs Laravel signature
19. **reject()** - Already exists, verify behavior

#### Medium Priority (Data Transformation)
20. **mapInto()** - Map into class instances
21. **mapSpread()** - Map with spread arguments
22. **mapToGroups()** - Map to grouped arrays
23. **mapWithKeys()** - Map with custom keys
24. **flatMap()** - Map and flatten
25. **partition()** - Split into two collections
26. **sliding()** - Create sliding windows
27. **split()** - Split into N chunks
28. **splitIn()** - Split into groups

#### Low Priority (Utility)
29. **dd()** - Dump and die (for debugging)
30. **dump()** - Dump without dying
31. **crossJoin()** - Cross join with arrays
32. **nth()** - Get every nth item
33. **pad()** - Pad collection to size
34. **prepend()** - Add item to beginning
35. **undot()** - Convert dot notation to nested
36. **join()** - Join collection as string
37. **implode()** - Alias for join

---

## Implementation Plan

### Step 1: Core Single-Item Methods (Day 1)

#### 1.1: sole() Method
**File:** `/src/Support/Collection.ts`

```typescript
/**
 * Get the first item in the collection but throw if there is not exactly one item
 * Inspired by Laravel's Collection::sole()
 */
sole<K extends keyof T>(key?: K, operator?: any, value?: any): T | T[K] {
  let filtered = this;
  
  if (key !== undefined) {
    if (value !== undefined) {
      filtered = this.where(key as string, operator, value);
    } else {
      filtered = this.where(key as string, operator);
    }
  }
  
  const count = filtered.length;
  
  if (count === 0) {
    throw new Error('Item not found.');
  }
  
  if (count > 1) {
    throw new Error('Multiple items found.');
  }
  
  return filtered[0];
}
```

#### 1.2: ensure() Method
```typescript
/**
 * Ensure all items in the collection are of the given type(s)
 * Inspired by Laravel's Collection::ensure()
 */
ensure(type: string | string[] | Function | Function[]): this {
  const types = Array.isArray(type) ? type : [type];
  
  for (const item of this) {
    let valid = false;
    
    for (const t of types) {
      if (typeof t === 'string') {
        // Check primitive type
        if (typeof item === t) {
          valid = true;
          break;
        }
      } else if (typeof t === 'function') {
        // Check instanceof
        if (item instanceof t) {
          valid = true;
          break;
        }
      }
    }
    
    if (!valid) {
      const expectedTypes = types.map(t => 
        typeof t === 'string' ? t : (t as any).name
      ).join('|');
      throw new Error(
        `Collection should only contain ${expectedTypes} items.`
      );
    }
  }
  
  return this;
}
```

#### 1.3: firstWhere() Method
```typescript
/**
 * Get the first item matching the given conditions
 * Inspired by Laravel's Collection::firstWhere()
 */
firstWhere<K extends keyof T>(
  key: K | string, 
  operator?: any, 
  value?: any
): T | undefined {
  let filtered: Collection<T>;
  
  if (value !== undefined) {
    filtered = this.where(key as string, operator, value);
  } else if (operator !== undefined) {
    filtered = this.where(key as string, operator);
  } else {
    // Just check if key is truthy
    filtered = this.filter((item: any) => item[key]);
  }
  
  return filtered.first();
}
```

#### 1.4: value() Method
```typescript
/**
 * Get the first item's value for a given key
 * Inspired by Laravel's Collection::value()
 */
value<K extends keyof T>(key: K): T[K] | undefined {
  const item = this.first();
  return item ? (item as any)[key] : undefined;
}
```

**Tests for Day 1:**
```typescript
describe('Collection Single-Item Methods', () => {
  describe('sole()', () => {
    it('should return item when exactly one exists', () => {
      const collection = new Collection({ id: 1 });
      expect(collection.sole()).toEqual({ id: 1 });
    });
    
    it('should throw when no items', () => {
      const collection = new Collection<any>();
      expect(() => collection.sole()).toThrow('Item not found');
    });
    
    it('should throw when multiple items', () => {
      const collection = new Collection({ id: 1 }, { id: 2 });
      expect(() => collection.sole()).toThrow('Multiple items found');
    });
    
    it('should filter before getting sole item', () => {
      const collection = new Collection(
        { id: 1, active: true },
        { id: 2, active: false }
      );
      expect(collection.sole('active', true)).toEqual({ id: 1, active: true });
    });
  });
  
  describe('ensure()', () => {
    it('should pass when all items match type', () => {
      const collection = new Collection('a', 'b', 'c');
      expect(() => collection.ensure('string')).not.toThrow();
    });
    
    it('should throw when item doesnt match type', () => {
      const collection = new Collection('a', 1, 'c');
      expect(() => collection.ensure('string')).toThrow();
    });
    
    it('should accept multiple types', () => {
      const collection = new Collection('a', 1, 'c');
      expect(() => collection.ensure(['string', 'number'])).not.toThrow();
    });
  });
  
  describe('firstWhere()', () => {
    it('should return first matching item', () => {
      const collection = new Collection(
        { id: 1, active: false },
        { id: 2, active: true },
        { id: 3, active: true }
      );
      expect(collection.firstWhere('active', true)).toEqual({ id: 2, active: true });
    });
  });
  
  describe('value()', () => {
    it('should return value of first item', () => {
      const collection = new Collection({ name: 'John' }, { name: 'Jane' });
      expect(collection.value('name')).toBe('John');
    });
  });
});
```

---

### Step 2: Conditional Execution Methods (Day 2)

#### 2.1: doesntContain() Method
```typescript
/**
 * Determine if the collection doesn't contain a given item
 * Inspired by Laravel's Collection::doesntContain()
 */
doesntContain(value: T | ((item: T) => boolean)): boolean {
  return !this.contains(value);
}
```

#### 2.2: containsStrict() Method
```typescript
/**
 * Determine if the collection contains a given item using strict comparison
 * Inspired by Laravel's Collection::containsStrict()
 */
containsStrict(key: string | T, value?: any): boolean {
  if (arguments.length === 1) {
    return this.some(item => item === key);
  }
  
  return this.some((item: any) => item[key as string] === value);
}
```

#### 2.3: containsOneItem() Method
```typescript
/**
 * Determine if the collection contains exactly one item
 * Inspired by Laravel's Collection::containsOneItem()
 */
containsOneItem(): boolean {
  return this.length === 1;
}
```

#### 2.4: pipe() Method
```typescript
/**
 * Pass the collection to the given callback and return the result
 * Inspired by Laravel's Collection::pipe()
 */
pipe<U>(callback: (collection: this) => U): U {
  return callback(this);
}
```

#### 2.5: tap() Method
```typescript
/**
 * Pass the collection to the given callback and return the collection
 * Inspired by Laravel's Collection::tap()
 */
tap(callback: (collection: this) => void): this {
  callback(this);
  return this;
}
```

#### 2.6: whenEmpty() Method
```typescript
/**
 * Execute the callback if the collection is empty
 * Inspired by Laravel's Collection::whenEmpty()
 */
whenEmpty<U>(callback: (collection: this) => U): this | U {
  if (this.isEmpty()) {
    return callback(this);
  }
  return this;
}
```

#### 2.7: whenNotEmpty() Method
```typescript
/**
 * Execute the callback if the collection is not empty
 * Inspired by Laravel's Collection::whenNotEmpty()
 */
whenNotEmpty<U>(callback: (collection: this) => U): this | U {
  if (this.isNotEmpty()) {
    return callback(this);
  }
  return this;
}
```

#### 2.8: unless() Method
```typescript
/**
 * Execute the callback unless the condition is true
 * Inspired by Laravel's Collection::unless()
 */
unless<U>(condition: boolean, callback: (collection: this) => U, defaultCallback?: (collection: this) => U): this | U {
  if (!condition) {
    return callback(this);
  }
  
  if (defaultCallback) {
    return defaultCallback(this);
  }
  
  return this;
}
```

---

### Step 3: Advanced Mapping Methods (Day 3-4)

#### 3.1: mapInto() Method
```typescript
/**
 * Map the collection items into instances of a given class
 * Inspired by Laravel's Collection::mapInto()
 */
mapInto<U>(constructor: new (...args: any[]) => U): Collection<U> {
  return this.map((item) => new constructor(item));
}
```

#### 3.2: mapSpread() Method
```typescript
/**
 * Run a map over each nested chunk of items
 * Inspired by Laravel's Collection::mapSpread()
 */
mapSpread<U>(callback: (...args: any[]) => U): Collection<U> {
  return this.map((chunk: any) => {
    if (Array.isArray(chunk)) {
      return callback(...chunk);
    }
    return callback(chunk);
  });
}
```

#### 3.3: mapToGroups() Method
```typescript
/**
 * Map each item to a key-value pair where key determines the group
 * Inspired by Laravel's Collection::mapToGroups()
 */
mapToGroups<K extends string | number, V>(
  callback: (item: T, index: number) => [K, V]
): Record<K, Collection<V>> {
  const groups: any = {};
  
  this.each((item, index) => {
    const [key, value] = callback(item, index);
    
    if (!groups[key]) {
      groups[key] = new Collection<V>();
    }
    
    groups[key].push(value);
  });
  
  return groups;
}
```

#### 3.4: mapWithKeys() Method
```typescript
/**
 * Map each item to a key-value pair
 * Inspired by Laravel's Collection::mapWithKeys()
 */
mapWithKeys<K extends string | number, V>(
  callback: (item: T, index: number) => [K, V] | Record<K, V>
): Record<K, V> {
  const result: any = {};
  
  this.each((item, index) => {
    const mapped = callback(item, index);
    
    if (Array.isArray(mapped)) {
      const [key, value] = mapped;
      result[key] = value;
    } else {
      Object.assign(result, mapped);
    }
  });
  
  return result;
}
```

#### 3.5: flatMap() Method
```typescript
/**
 * Map a callback over each item and flatten the result
 * Inspired by Laravel's Collection::flatMap()
 */
flatMap<U>(callback: (item: T, index: number) => U | U[]): Collection<U> {
  const mapped = this.map(callback);
  return mapped.flatten(1) as Collection<U>;
}
```

#### 3.6: partition() Method
```typescript
/**
 * Partition the collection into two arrays using a callback
 * Inspired by Laravel's Collection::partition()
 */
partition(callback: (item: T, index: number) => boolean): [Collection<T>, Collection<T>] {
  const passing = new Collection<T>();
  const failing = new Collection<T>();
  
  this.each((item, index) => {
    if (callback(item, index)) {
      passing.push(item);
    } else {
      failing.push(item);
    }
  });
  
  return [passing, failing];
}
```

---

### Step 4: Chunking & Sliding Methods (Day 5)

#### 4.1: sliding() Method
```typescript
/**
 * Create chunks representing a "sliding window" view of the items
 * Inspired by Laravel's Collection::sliding()
 */
sliding(size: number = 2, step: number = 1): Collection<Collection<T>> {
  const chunks = new Collection<Collection<T>>();
  
  for (let i = 0; i < this.length; i += step) {
    const chunk = this.slice(i, i + size);
    
    if (chunk.length < size) {
      break;
    }
    
    chunks.push(chunk);
  }
  
  return chunks;
}
```

#### 4.2: split() Method
```typescript
/**
 * Split a collection into a certain number of groups
 * Inspired by Laravel's Collection::split()
 */
split(numberOfGroups: number): Collection<Collection<T>> {
  if (numberOfGroups <= 0) {
    return new Collection<Collection<T>>();
  }
  
  const groupSize = Math.ceil(this.length / numberOfGroups);
  
  return this.chunk(groupSize);
}
```

#### 4.3: splitIn() Method
```typescript
/**
 * Split a collection into a certain number of groups, distributing items evenly
 * Inspired by Laravel's Collection::splitIn()
 */
splitIn(numberOfGroups: number): Collection<Collection<T>> {
  return this.split(numberOfGroups);
}
```

#### 4.4: nth() Method
```typescript
/**
 * Create a new collection consisting of every n-th element
 * Inspired by Laravel's Collection::nth()
 */
nth(step: number, offset: number = 0): Collection<T> {
  const items: T[] = [];
  
  for (let i = offset; i < this.length; i += step) {
    items.push(this[i]);
  }
  
  return new Collection<T>(...items);
}
```

---

### Step 5: Utility Methods (Day 6)

#### 5.1: pad() Method
```typescript
/**
 * Pad collection to the specified length with a value
 * Inspired by Laravel's Collection::pad()
 */
pad(size: number, value: T): Collection<T> {
  const padded = [...this];
  
  if (size > 0) {
    // Pad to the right
    while (padded.length < size) {
      padded.push(value);
    }
  } else if (size < 0) {
    // Pad to the left
    while (padded.length < Math.abs(size)) {
      padded.unshift(value);
    }
  }
  
  return new Collection<T>(...padded);
}
```

#### 5.2: prepend() Method
```typescript
/**
 * Push an item onto the beginning of the collection
 * Inspired by Laravel's Collection::prepend()
 */
prepend(value: T, key?: string | number): this {
  if (key !== undefined) {
    // For associative arrays
    const items: any = { [key]: value };
    Object.assign(items, this);
    this.length = 0;
    this.push(...Object.values(items));
  } else {
    this.unshift(value);
  }
  
  return this;
}
```

#### 5.3: join() Method
```typescript
/**
 * Join all items from the collection using a string
 * Inspired by Laravel's Collection::join()
 */
join(glue: string, finalGlue?: string): string {
  if (finalGlue === undefined) {
    return this.map(item => String(item)).join(glue);
  }
  
  if (this.length === 0) {
    return '';
  }
  
  if (this.length === 1) {
    return String(this[0]);
  }
  
  const lastItem = String(this[this.length - 1]);
  const firstItems = this.slice(0, -1).map(item => String(item)).join(glue);
  
  return `${firstItems}${finalGlue}${lastItem}`;
}
```

#### 5.4: implode() Method (alias for join)
```typescript
/**
 * Alias for join() method
 * Inspired by Laravel's Collection::implode()
 */
implode(glue: string, finalGlue?: string): string {
  return this.join(glue, finalGlue);
}
```

#### 5.5: crossJoin() Method
```typescript
/**
 * Cross join with the given lists, returning all possible permutations
 * Inspired by Laravel's Collection::crossJoin()
 */
crossJoin<U>(...arrays: U[][]): Collection<(T | U)[]> {
  const result: (T | U)[][] = [];
  
  const crossJoinHelper = (current: (T | U)[], remaining: any[][]): void => {
    if (remaining.length === 0) {
      result.push([...current]);
      return;
    }
    
    const [first, ...rest] = remaining;
    for (const item of first) {
      crossJoinHelper([...current, item], rest);
    }
  };
  
  for (const item of this) {
    crossJoinHelper([item], arrays);
  }
  
  return new Collection(...result);
}
```

#### 5.6: dd() and dump() Methods
```typescript
/**
 * Dump the collection and end execution
 * Inspired by Laravel's Collection::dd()
 */
dd(...args: any[]): never {
  console.log('Collection Debug:', this.toArray());
  if (args.length > 0) {
    console.log('Arguments:', ...args);
  }
  process.exit(1);
}

/**
 * Dump the collection
 * Inspired by Laravel's Collection::dump()
 */
dump(...args: any[]): this {
  console.log('Collection Debug:', this.toArray());
  if (args.length > 0) {
    console.log('Arguments:', ...args);
  }
  return this;
}
```

---

### Step 6: Additional Laravel Helpers (Day 7)

#### 6.1: undot() Method
```typescript
/**
 * Convert dot notation to nested array/object
 * Inspired by Laravel's Collection::undot()
 */
undot(): any {
  const result: any = {};
  
  this.each((value: any, key: any) => {
    const keys = String(key).split('.');
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  });
  
  return result;
}
```

#### 6.2: collect() Static Method
```typescript
/**
 * Create a new collection instance
 * Inspired by Laravel's collect() helper
 */
static collect<T>(items: T[] = []): Collection<T> {
  return new Collection<T>(...items);
}
```

---

## Testing Strategy

### Unit Tests (Day 8)
**File:** `/tests/unit/Support/Collection.test.ts`

```typescript
describe('Collection - Laravel Parity', () => {
  // Day 1 tests
  describe('Single Item Methods', () => {
    // sole(), ensure(), firstWhere(), value()
  });
  
  // Day 2 tests
  describe('Conditional Execution', () => {
    // doesntContain(), pipe(), tap(), whenEmpty(), whenNotEmpty(), unless()
  });
  
  // Day 3-4 tests
  describe('Advanced Mapping', () => {
    // mapInto(), mapSpread(), mapToGroups(), mapWithKeys(), flatMap(), partition()
  });
  
  // Day 5 tests
  describe('Chunking & Sliding', () => {
    // sliding(), split(), splitIn(), nth()
  });
  
  // Day 6 tests
  describe('Utility Methods', () => {
    // pad(), prepend(), join(), implode(), crossJoin(), dd(), dump()
  });
  
  // Day 7 tests
  describe('Additional Helpers', () => {
    // undot(), collect()
  });
});
```

### Integration Tests (Day 9)
Test Collection methods with Eloquent models:

```typescript
describe('Collection with Eloquent', () => {
  it('should work with model collections', async () => {
    const users = await User.all();
    
    // Test chaining
    const result = users
      .where('active', true)
      .pipe(collection => collection.pluck('name'))
      .join(', ', ' and ');
    
    expect(typeof result).toBe('string');
  });
  
  it('should partition models', async () => {
    const users = await User.all();
    const [admins, regular] = users.partition(user => user.is_admin);
    
    expect(admins).toBeInstanceOf(Collection);
    expect(regular).toBeInstanceOf(Collection);
  });
});
```

---

## Documentation

### JSDoc Examples
Every new method needs complete JSDoc with examples:

```typescript
/**
 * Get the first item in the collection but throw if there is not exactly one item
 * 
 * @example
 * ```typescript
 * const collection = new Collection({ id: 1 });
 * collection.sole(); // { id: 1 }
 * 
 * const collection = new Collection({ id: 1 }, { id: 2 });
 * collection.sole(); // throws Error: Multiple items found
 * ```
 * 
 * @throws {Error} If zero or multiple items found
 */
sole<K extends keyof T>(key?: K, operator?: any, value?: any): T | T[K]
```

### User Documentation
**File:** `docs/collections.md`

Update with all new methods, organized by category:
1. Single Item Access
2. Conditional Execution
3. Advanced Mapping
4. Chunking & Sliding
5. Utility Methods

---

## Success Criteria

- [ ] All 30+ missing methods implemented
- [ ] 100% test coverage for new methods
- [ ] All tests pass
- [ ] Documentation complete
- [ ] Laravel behavior matched exactly
- [ ] Works with Eloquent collections
- [ ] TypeScript types complete
- [ ] CHANGELOG updated

---

## Timeline

| Day | Task | Completion |
|-----|------|------------|
| 1 | Core single-item methods | Jan 19 |
| 2 | Conditional execution methods | Jan 20 |
| 3-4 | Advanced mapping methods | Jan 22 |
| 5 | Chunking & sliding methods | Jan 23 |
| 6 | Utility methods | Jan 24 |
| 7 | Additional helpers | Jan 25 |
| 8 | Unit tests | Jan 26 |
| 9 | Integration tests | Jan 27 |

**Phase 2 Completion:** January 27, 2026
