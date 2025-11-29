# GuruORM Coding Standards

This document defines the coding standards and patterns to be followed throughout the GuruORM project. Consistency is critical for maintaining a professional, production-ready npm package.

## Table of Contents
- [Error Handling](#error-handling)
- [Parameter Handling](#parameter-handling)
- [Async/Await Patterns](#asyncawait-patterns)
- [Array and Object Handling](#array-and-object-handling)
- [Type Checking](#type-checking)
- [Grammar Parameter Counters](#grammar-parameter-counters)
- [Model Instantiation](#model-instantiation)
- [Method Naming](#method-naming)
- [Documentation](#documentation)

---

## Error Handling

### Standard Pattern
```typescript
// ✅ CORRECT - Use try-catch in async methods
async myMethod(): Promise<ResultType> {
  try {
    // Implementation
    return result;
  } catch (error) {
    throw new Error(`Failed to perform operation: ${(error as Error).message}`);
  }
}

// ✅ CORRECT - Throw meaningful errors
if (!requiredValue) {
  throw new Error('Required parameter "requiredValue" is missing');
}

// ❌ INCORRECT - Generic error messages
throw new Error('An error occurred');

// ❌ INCORRECT - Missing error context
throw error;
```

### Connection Error Handling
```typescript
// ✅ CORRECT - All Connection methods
async select(query: string, bindings: any[] = []): Promise<any[]> {
  await this.ensureConnected();
  const startTime = Date.now();
  
  try {
    const result = await this.performQuery(query, bindings);
    const time = Date.now() - startTime;
    this.logQuery(query, bindings, time);
    return result;
  } catch (error) {
    throw this.handleQueryException(error as Error, query, bindings);
  }
}
```

---

## Parameter Handling

### Null/Undefined Checking
```typescript
// ✅ CORRECT - Check for undefined explicitly
if (value === undefined || value === null) {
  // Handle missing value
}

// ✅ CORRECT - Use nullish coalescing for defaults
const limit = limitValue ?? 10;

// ❌ INCORRECT - Loose falsy check (rejects 0, false, '')
if (!value) {
  // This will fail for legitimate falsy values
}
```

### Optional Parameters with Defaults
```typescript
// ✅ CORRECT - Use default parameters
async get(columns: string[] = ['*']): Promise<any[]> {
  // Implementation
}

// ✅ CORRECT - Handle optional parameters
where(column: string, operator?: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
  // If value is undefined, assume operator is the value
  if (value === undefined) {
    value = operator;
    operator = '=';
  }
  // Implementation
}

// ❌ INCORRECT - No default, forces users to pass null
async get(columns: string[]): Promise<any[]> {
  // Forces: query.get(['*']) instead of query.get()
}
```

---

## Async/Await Patterns

### Standard Async Method Pattern
```typescript
// ✅ CORRECT - Always await database operations
async insert(values: any): Promise<boolean> {
  const sql = this.grammar.compileInsert(this, [values]);
  const bindings = this.grammar.prepareBindingsForInsert(this.bindings, [values]);
  
  return await this.connection.insert(sql, bindings);
}

// ✅ CORRECT - Chain awaits for sequential operations
async save(): Promise<boolean> {
  if (this.exists) {
    return await this.performUpdate();
  } else {
    return await this.performInsert();
  }
}

// ❌ INCORRECT - Missing await (returns Promise instead of value)
async insert(values: any): Promise<boolean> {
  return this.connection.insert(sql, bindings); // Missing await
}

// ❌ INCORRECT - Unnecessary async
async toSql(): string {
  return this.grammar.compileSelect(this); // No await needed
}
```

---

## Array and Object Handling

### Array Wrapping Pattern
```typescript
// ✅ CORRECT - Consistent array wrapping
const valuesArray = Array.isArray(values) ? values : [values];

// ✅ CORRECT - Check if already array of objects
async insert(values: any[] | any): Promise<boolean> {
  // If values is array, use as-is; if object, wrap in array
  const valuesArray = Array.isArray(values) ? values : [values];
  // ...
}

// ❌ INCORRECT - Inconsistent wrapping (old pattern)
const valuesArray = Array.isArray(values[0]) ? values : [values];
// This creates [[values]] if values is already an array of objects!
```

### Object Key Checking
```typescript
// ✅ CORRECT - Check object has keys
if (Object.keys(values).length === 0) {
  throw new Error('Values object cannot be empty');
}

// ✅ CORRECT - Safe property access
if (object.hasOwnProperty('property')) {
  // Use property
}

// ❌ INCORRECT - Unsafe object access
if (object['property']) {
  // May fail if property value is falsy
}
```

---

## Type Checking

### Type Guards
```typescript
// ✅ CORRECT - Use typeof for primitives
if (typeof column === 'function') {
  return this.whereNested(column, boolean);
}

if (typeof value === 'string') {
  // String-specific logic
}

// ✅ CORRECT - Use instanceof for classes
if (value instanceof Expression) {
  return this.getValue(value);
}

if (model instanceof Model) {
  // Model-specific logic
}

// ✅ CORRECT - Use Array.isArray for arrays
if (Array.isArray(values)) {
  // Array-specific logic
}

// ❌ INCORRECT - Wrong type check
if (typeof values === 'array') {
  // typeof never returns 'array'!
}
```

---

## Grammar Parameter Counters

### PostgreSQL Parameter Counter Pattern
```typescript
// ✅ CORRECT - Reset counter in all compile methods
export class PostgresGrammar extends Grammar {
  protected parameterCounter = 0;

  parameter(value?: any): string {
    return `$${++this.parameterCounter}`;
  }

  compileSelect(query: any): string {
    this.parameterCounter = 0;
    return super.compileSelect(query);
  }

  compileInsert(query: any, values: any[]): string {
    this.parameterCounter = 0;
    return super.compileInsert(query, values);
  }

  compileUpdate(query: any, values: any): string {
    this.parameterCounter = 0;
    return super.compileUpdate(query, values);
  }
  
  compileDelete(query: any): string {
    this.parameterCounter = 0;
    return super.compileDelete(query);
  }
}

// ❌ INCORRECT - Missing counter reset
compileUpdate(query: any, values: any): string {
  // Missing: this.parameterCounter = 0;
  return super.compileUpdate(query, values);
}
```

### Raw SQL Placeholder Replacement
```typescript
// ✅ CORRECT - Replace ? with $N in raw SQL
protected compileHaving(having: any): string {
  if (having.type === "Raw") {
    let sql = having.sql;
    const matches = sql.match(/\?/g);
    if (matches) {
      for (let i = 0; i < matches.length; i++) {
        sql = sql.replace('?', this.parameter());
      }
    }
    return sql;
  }
  // ...
}

// ❌ INCORRECT - Returning raw SQL with ? placeholders
protected compileHaving(having: any): string {
  if (having.type === "Raw") {
    return having.sql; // PostgreSQL won't understand ?
  }
}
```

---

## Model Instantiation

### Standard Pattern
```typescript
// ✅ CORRECT - Constructor returns Proxy
constructor(attributes: Record<string, any> = {}) {
  this.syncOriginal();
  this.fill(attributes);
  this.bootIfNotBooted();
  
  return new Proxy(this, {
    get(target, prop, receiver) {
      // Proxy logic
    },
    set(target, prop, value) {
      // Proxy logic
    }
  });
}

// ✅ CORRECT - newInstance also returns Proxy
newInstance(attributes: Record<string, any> = {}, exists = false): this {
  const model = Object.create(Object.getPrototypeOf(this));
  Object.assign(model, this);
  
  model.attributes = attributes;
  model.exists = exists;
  model.syncOriginal();
  
  // Return Proxy to maintain consistent behavior
  return new Proxy(model, {
    // Same Proxy logic as constructor
  }) as this;
}

// ❌ INCORRECT - Inconsistent Proxy wrapping
newInstance(attributes: Record<string, any> = {}, exists = false): this {
  const model = Object.create(Object.getPrototypeOf(this));
  return model; // Missing Proxy!
}
```

### Static Factory Methods
```typescript
// ✅ CORRECT - Call fill() after instantiation
static async create<T extends Model>(
  this: new (attributes?: Record<string, any>) => T,
  attributes: Record<string, any> = {}
): Promise<T> {
  const model = new this();
  model.fill(attributes);
  await model.save();
  return model;
}

// ❌ INCORRECT - Passing attributes to constructor
static async create<T extends Model>(
  this: new (attributes?: Record<string, any>) => T,
  attributes: Record<string, any> = {}
): Promise<T> {
  const model = new this(attributes); // Won't work if subclass doesn't accept args
  await model.save();
  return model;
}
```

---

## Method Naming

### Follow Laravel Conventions
```typescript
// ✅ CORRECT - Eloquent-style naming
class Model {
  async save(): Promise<boolean> { }
  async delete(): Promise<boolean> { }
  async refresh(): Promise<this> { }
  static async find(): Promise<Model | null> { }
  static async create(): Promise<Model> { }
}

// ✅ CORRECT - Query Builder naming
class Builder {
  where(): this { }
  orderBy(): this { }
  limit(): this { }
  get(): Promise<any[]> { }
  first(): Promise<any> { }
  insert(): Promise<boolean> { }
}

// ❌ INCORRECT - Non-standard naming
class Model {
  async persist(): Promise<boolean> { } // Should be save()
  async remove(): Promise<boolean> { } // Should be delete()
  async reload(): Promise<this> { } // Should be refresh()
}
```

### Boolean Method Naming
```typescript
// ✅ CORRECT - Use is/has/should prefix
class Model {
  isFillable(key: string): boolean { }
  hasAttribute(key: string): boolean { }
  shouldCast(key: string): boolean { }
}

// ❌ INCORRECT - Unclear boolean methods
class Model {
  fillable(key: string): boolean { } // Sounds like a property
  attribute(key: string): boolean { } // Ambiguous
}
```

---

## Documentation

### JSDoc Standard
```typescript
/**
 * Add a basic where clause to the query
 * 
 * @param column - The column name or a closure for nested where
 * @param operator - The comparison operator (=, !=, >, <, etc.)
 * @param value - The value to compare against
 * @param boolean - The boolean operator (and/or) to chain this where clause
 * @returns The Builder instance for method chaining
 * 
 * @example
 * ```typescript
 * query.where('name', 'John')
 * query.where('age', '>', 18)
 * query.where(q => q.where('status', 'active'))
 * ```
 */
where(
  column: string | Function,
  operator?: any,
  value?: any,
  boolean: 'and' | 'or' = 'and'
): this {
  // Implementation
}

// ❌ INCORRECT - Missing or incomplete documentation
// Add a where clause
where(column: string, operator?: any, value?: any): this {
  // Implementation
}
```

---

## Summary Checklist

When writing or reviewing code, ensure:

- [ ] All async methods use try-catch with meaningful error messages
- [ ] Parameters are validated with explicit undefined checks
- [ ] Arrays are wrapped consistently using `Array.isArray()`
- [ ] Type checks use correct operators (typeof, instanceof, Array.isArray)
- [ ] PostgreSQL Grammar resets parameter counter in all compile methods
- [ ] Model instances are consistently wrapped in Proxy
- [ ] Method names follow Laravel/Eloquent conventions
- [ ] All public methods have comprehensive JSDoc comments
- [ ] Error messages are descriptive and include context
- [ ] No code duplication - extract to helper methods

---

## References

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Laravel Eloquent Documentation](https://laravel.com/docs/eloquent)
- [npm Package Best Practices](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
