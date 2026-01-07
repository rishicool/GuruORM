# Phase 4: Query Builder & Schema Enhancements

**Duration:** 7 days + 2 days testing  
**Priority:** MEDIUM  
**Version:** 2.1.0-beta.4

---

## Overview

Phase 4 completes the Query Builder with all missing Laravel methods and enhances Schema Builder with modern Laravel 10/11 features. This includes having clauses, JSON operations, PostgreSQL array support, and schema introspection helpers.

**Current State:**
- ✅ Basic Query Builder (95% complete)
- ✅ Schema Builder with migrations (75% complete)
- ❌ havingNull() family missing
- ❌ JSON query methods incomplete
- ❌ PostgreSQL array operations missing
- ❌ Modern Schema helpers missing (foreignId, change, renameColumn)
- ❌ Grammar support incomplete for some databases

**Target State:**
- ✅ 100% Query Builder parity with Laravel
- ✅ 100% Schema Builder parity
- ✅ Full grammar support for all databases
- ✅ JSON and array operations complete
- ✅ Modern migration helpers

---

## Detailed Implementation Plan

### Day 1: Having Null Methods (1 day)

#### Morning: Implement havingNull() Family

**Laravel Behavior:**
```php
DB::table('orders')
    ->select('customer_id', DB::raw('SUM(amount) as total'))
    ->groupBy('customer_id')
    ->havingNull('customer_email')
    ->get();
```

**GuruORM Target:**
```typescript
await DB.table('orders')
    .select('customer_id', DB.raw('SUM(amount) as total'))
    .groupBy('customer_id')
    .havingNull('customer_email')
    .get();
```

**File:** `/src/Query/Builder.ts`

**Step 1.1: Add havingNull()**

```typescript
/**
 * Add a "having null" clause to the query
 * Inspired by Laravel's Builder::havingNull()
 * 
 * @example
 * ```typescript
 * await DB.table('orders')
 *     .select('customer_id', DB.raw('SUM(amount) as total'))
 *     .groupBy('customer_id')
 *     .havingNull('email')
 *     .get();
 * ```
 */
havingNull(column: string, boolean: string = 'and', not: boolean = false): this {
    const type = not ? 'NotNull' : 'Null';
    
    this.havings.push({
        type: type,
        column: column,
        boolean: boolean
    });
    
    return this;
}

/**
 * Add a "having not null" clause to the query
 * Inspired by Laravel's Builder::havingNotNull()
 */
havingNotNull(column: string, boolean: string = 'and'): this {
    return this.havingNull(column, boolean, true);
}

/**
 * Add an "or having null" clause to the query
 * Inspired by Laravel's Builder::orHavingNull()
 */
orHavingNull(column: string): this {
    return this.havingNull(column, 'or', false);
}

/**
 * Add an "or having not null" clause to the query
 * Inspired by Laravel's Builder::orHavingNotNull()
 */
orHavingNotNull(column: string): this {
    return this.havingNull(column, 'or', true);
}
```

---

#### Afternoon: Grammar Support for Having Null

**Step 1.2: Update Grammar Classes**

**File:** `/src/Query/Grammars/Grammar.ts` (Base Class)

```typescript
/**
 * Compile a "having null" clause
 */
protected compileHavingNull(query: Builder, having: any): string {
    return `${this.wrap(having.column)} is null`;
}

/**
 * Compile a "having not null" clause
 */
protected compileHavingNotNull(query: Builder, having: any): string {
    return `${this.wrap(having.column)} is not null`;
}

/**
 * Compile having clauses
 */
protected compileHavings(query: Builder, havings: any[]): string {
    if (havings.length === 0) {
        return '';
    }
    
    const sql: string[] = [];
    
    for (const having of havings) {
        const method = `compileHaving${having.type}`;
        
        if (typeof (this as any)[method] === 'function') {
            const compiled = (this as any)[method](query, having);
            
            if (sql.length === 0) {
                sql.push(`having ${compiled}`);
            } else {
                sql.push(`${having.boolean} ${compiled}`);
            }
        }
    }
    
    return sql.join(' ');
}
```

**Test All Database Grammars:**

```typescript
describe('Query Builder Having Null Methods', () => {
    describe('PostgreSQL', () => {
        it('should compile havingNull correctly', () => {
            const query = DB.connection('pgsql')
                .table('orders')
                .select('customer_id', DB.raw('SUM(amount) as total'))
                .groupBy('customer_id')
                .havingNull('email');
            
            const sql = query.toSql();
            
            expect(sql).toBe(
                'select "customer_id", SUM(amount) as total from "orders" ' +
                'group by "customer_id" having "email" is null'
            );
        });

        it('should compile havingNotNull correctly', () => {
            const query = DB.connection('pgsql')
                .table('orders')
                .select('customer_id', DB.raw('COUNT(*) as count'))
                .groupBy('customer_id')
                .havingNotNull('phone');
            
            const sql = query.toSql();
            
            expect(sql).toContain('having "phone" is not null');
        });

        it('should compile orHavingNull correctly', () => {
            const query = DB.connection('pgsql')
                .table('orders')
                .select('customer_id', DB.raw('SUM(amount) as total'))
                .groupBy('customer_id')
                .havingNull('email')
                .orHavingNull('phone');
            
            const sql = query.toSql();
            
            expect(sql).toContain('having "email" is null or "phone" is null');
        });
    });

    describe('MySQL', () => {
        it('should compile havingNull correctly', () => {
            const query = DB.connection('mysql')
                .table('orders')
                .select('customer_id', DB.raw('SUM(amount) as total'))
                .groupBy('customer_id')
                .havingNull('email');
            
            const sql = query.toSql();
            
            expect(sql).toBe(
                'select `customer_id`, SUM(amount) as total from `orders` ' +
                'group by `customer_id` having `email` is null'
            );
        });
    });

    describe('SQLite', () => {
        it('should compile havingNull correctly', () => {
            const query = DB.connection('sqlite')
                .table('orders')
                .select('customer_id', DB.raw('SUM(amount) as total'))
                .groupBy('customer_id')
                .havingNull('email');
            
            const sql = query.toSql();
            
            expect(sql).toContain('having "email" is null');
        });
    });
});
```

---

### Day 2-3: JSON Query Methods (2 days)

#### Day 2 Morning: whereJsonContainsKey()

**Laravel Behavior:**
```php
// Check if JSON contains specific key
DB::table('users')
    ->whereJsonContainsKey('options->notifications')
    ->get();

// PostgreSQL: options ? 'notifications'
// MySQL: JSON_CONTAINS_PATH(options, 'one', '$.notifications')
```

**Implementation:**

**File:** `/src/Query/Builder.ts`

```typescript
/**
 * Add a "where JSON contains key" clause to the query
 * Inspired by Laravel's Builder::whereJsonContainsKey()
 * 
 * @example
 * ```typescript
 * await DB.table('users')
 *     .whereJsonContainsKey('options->notifications')
 *     .get();
 * ```
 */
whereJsonContainsKey(
    column: string,
    boolean: string = 'and',
    not: boolean = false
): this {
    const type = not ? 'JsonDoesntContainKey' : 'JsonContainsKey';
    
    this.wheres.push({
        type: type,
        column: column,
        boolean: boolean
    });
    
    return this;
}

/**
 * Add a "where JSON doesn't contain key" clause
 * Inspired by Laravel's Builder::whereJsonDoesntContainKey()
 */
whereJsonDoesntContainKey(column: string, boolean: string = 'and'): this {
    return this.whereJsonContainsKey(column, boolean, true);
}

/**
 * Add an "or where JSON contains key" clause
 */
orWhereJsonContainsKey(column: string): this {
    return this.whereJsonContainsKey(column, 'or', false);
}

/**
 * Add an "or where JSON doesn't contain key" clause
 */
orWhereJsonDoesntContainKey(column: string): this {
    return this.whereJsonContainsKey(column, 'or', true);
}
```

---

#### Day 2 Afternoon: Grammar Support for JSON Operations

**PostgreSQL Grammar:**

**File:** `/src/Query/Grammars/PostgresGrammar.ts`

```typescript
/**
 * Compile a "where JSON contains key" clause (PostgreSQL)
 */
protected compileWhereJsonContainsKey(query: Builder, where: any): string {
    // Parse column and path: options->notifications
    const [column, path] = this.parseJsonPath(where.column);
    
    // PostgreSQL: options ? 'notifications'
    return `${this.wrap(column)} ? ${this.parameter(path)}`;
}

/**
 * Compile a "where JSON doesn't contain key" clause (PostgreSQL)
 */
protected compileWhereJsonDoesntContainKey(query: Builder, where: any): string {
    const [column, path] = this.parseJsonPath(where.column);
    
    // PostgreSQL: NOT (options ? 'notifications')
    return `not (${this.wrap(column)} ? ${this.parameter(path)})`;
}

/**
 * Parse JSON path from column expression
 * Example: options->notifications => ['options', 'notifications']
 */
protected parseJsonPath(column: string): [string, string] {
    const parts = column.split('->');
    const baseColumn = parts[0];
    const path = parts.slice(1).join('.');
    
    return [baseColumn, path];
}
```

**MySQL Grammar:**

**File:** `/src/Query/Grammars/MySqlGrammar.ts`

```typescript
/**
 * Compile a "where JSON contains key" clause (MySQL)
 */
protected compileWhereJsonContainsKey(query: Builder, where: any): string {
    const [column, path] = this.parseJsonPath(where.column);
    
    // MySQL: JSON_CONTAINS_PATH(options, 'one', '$.notifications')
    return `json_contains_path(${this.wrap(column)}, 'one', ${this.parameter('$.' + path)})`;
}

/**
 * Compile a "where JSON doesn't contain key" clause (MySQL)
 */
protected compileWhereJsonDoesntContainKey(query: Builder, where: any): string {
    const [column, path] = this.parseJsonPath(where.column);
    
    // MySQL: NOT JSON_CONTAINS_PATH(...)
    return `not json_contains_path(${this.wrap(column)}, 'one', ${this.parameter('$.' + path)})`;
}
```

---

#### Day 3 Morning: whereJsonLength()

**Laravel Behavior:**
```php
// Check JSON array length
DB::table('users')
    ->whereJsonLength('options->languages', '>', 1)
    ->get();
```

**Implementation:**

```typescript
/**
 * Add a "where JSON length" clause to the query
 * Inspired by Laravel's Builder::whereJsonLength()
 * 
 * @example
 * ```typescript
 * await DB.table('users')
 *     .whereJsonLength('options->languages', '>', 1)
 *     .get();
 * ```
 */
whereJsonLength(
    column: string,
    operator: any,
    value?: any,
    boolean: string = 'and'
): this {
    // Normalize operator/value
    [operator, value] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
    
    this.wheres.push({
        type: 'JsonLength',
        column: column,
        operator: operator,
        value: value,
        boolean: boolean
    });
    
    this.addBinding(value, 'where');
    
    return this;
}

/**
 * Add an "or where JSON length" clause
 */
orWhereJsonLength(column: string, operator: any, value?: any): this {
    return this.whereJsonLength(column, operator, value, 'or');
}
```

**Grammar Support:**

```typescript
// PostgreSQL
protected compileWhereJsonLength(query: Builder, where: any): string {
    const [column, path] = this.parseJsonPath(where.column);
    
    // jsonb_array_length(options->'languages') > 1
    const jsonPath = path ? `${this.wrap(column)}->'${path}'` : this.wrap(column);
    
    return `jsonb_array_length(${jsonPath}) ${where.operator} ${this.parameter(where.value)}`;
}

// MySQL
protected compileWhereJsonLength(query: Builder, where: any): string {
    const [column, path] = this.parseJsonPath(where.column);
    
    // JSON_LENGTH(options, '$.languages') > 1
    const pathParam = path ? this.parameter('$.' + path) : null;
    const jsonFunc = pathParam 
        ? `json_length(${this.wrap(column)}, ${pathParam})`
        : `json_length(${this.wrap(column)})`;
    
    return `${jsonFunc} ${where.operator} ${this.parameter(where.value)}`;
}
```

---

#### Day 3 Afternoon: Complete JSON Tests

```typescript
describe('Query Builder JSON Methods', () => {
    let db: any;

    beforeEach(async () => {
        db = DB.connection('pgsql');
        
        await db.schema().create('users', (table: any) => {
            table.increments('id');
            table.string('name');
            table.jsonb('options');
        });
        
        await db.table('users').insert([
            {
                name: 'John',
                options: JSON.stringify({
                    notifications: { email: true, sms: false },
                    languages: ['en', 'es']
                })
            },
            {
                name: 'Jane',
                options: JSON.stringify({
                    theme: 'dark',
                    languages: ['en', 'fr', 'de']
                })
            },
            {
                name: 'Bob',
                options: JSON.stringify({
                    notifications: { email: false },
                    languages: ['en']
                })
            }
        ]);
    });

    describe('whereJsonContainsKey()', () => {
        it('should find records with specific JSON key', async () => {
            const users = await db.table('users')
                .whereJsonContainsKey('options->notifications')
                .get();
            
            expect(users.length).toBe(2); // John and Bob
            expect(users.map((u: any) => u.name)).toContain('John');
            expect(users.map((u: any) => u.name)).toContain('Bob');
        });

        it('should work with nested keys', async () => {
            const users = await db.table('users')
                .whereJsonContainsKey('options->notifications->email')
                .get();
            
            expect(users.length).toBe(2);
        });
    });

    describe('whereJsonDoesntContainKey()', () => {
        it('should find records without specific JSON key', async () => {
            const users = await db.table('users')
                .whereJsonDoesntContainKey('options->notifications')
                .get();
            
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Jane');
        });
    });

    describe('whereJsonLength()', () => {
        it('should filter by JSON array length', async () => {
            const users = await db.table('users')
                .whereJsonLength('options->languages', '>', 1)
                .get();
            
            expect(users.length).toBe(2); // John and Jane
        });

        it('should work with exact length', async () => {
            const users = await db.table('users')
                .whereJsonLength('options->languages', 3)
                .get();
            
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Jane');
        });

        it('should work with less than', async () => {
            const users = await db.table('users')
                .whereJsonLength('options->languages', '<', 2)
                .get();
            
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Bob');
        });
    });

    describe('combined JSON queries', () => {
        it('should combine multiple JSON conditions', async () => {
            const users = await db.table('users')
                .whereJsonContainsKey('options->notifications')
                .whereJsonLength('options->languages', '>=', 2)
                .get();
            
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('John');
        });
    });
});
```

---

### Day 4: PostgreSQL Array Operations (1 day)

#### Morning: whereArrayContains() and Related Methods

**Laravel Behavior:**
```php
// PostgreSQL array operations
DB::table('posts')
    ->whereArrayContains('tags', ['php', 'laravel'])
    ->get();
```

**Implementation:**

**File:** `/src/Query/Builder.ts`

```typescript
/**
 * Add a "where array contains" clause (PostgreSQL only)
 * Inspired by Laravel's Builder::whereArrayContains()
 * 
 * @example
 * ```typescript
 * await DB.table('posts')
 *     .whereArrayContains('tags', ['php', 'laravel'])
 *     .get();
 * ```
 */
whereArrayContains(
    column: string,
    values: any[],
    boolean: string = 'and',
    not: boolean = false
): this {
    const type = not ? 'ArrayNotContains' : 'ArrayContains';
    
    this.wheres.push({
        type: type,
        column: column,
        values: values,
        boolean: boolean
    });
    
    this.addBinding(values, 'where');
    
    return this;
}

/**
 * Add an "or where array contains" clause
 */
orWhereArrayContains(column: string, values: any[]): this {
    return this.whereArrayContains(column, values, 'or', false);
}

/**
 * Add a "where array overlaps" clause (PostgreSQL)
 * Check if arrays have any common elements
 * 
 * @example
 * ```typescript
 * await DB.table('posts')
 *     .whereArrayOverlaps('tags', ['php', 'javascript'])
 *     .get();
 * ```
 */
whereArrayOverlaps(
    column: string,
    values: any[],
    boolean: string = 'and',
    not: boolean = false
): this {
    const type = not ? 'ArrayNotOverlaps' : 'ArrayOverlaps';
    
    this.wheres.push({
        type: type,
        column: column,
        values: values,
        boolean: boolean
    });
    
    this.addBinding(values, 'where');
    
    return this;
}

/**
 * Add an "or where array overlaps" clause
 */
orWhereArrayOverlaps(column: string, values: any[]): this {
    return this.whereArrayOverlaps(column, values, 'or', false);
}

/**
 * Add a "where array length" clause (PostgreSQL)
 * 
 * @example
 * ```typescript
 * await DB.table('posts')
 *     .whereArrayLength('tags', '>', 3)
 *     .get();
 * ```
 */
whereArrayLength(
    column: string,
    operator: any,
    value?: any,
    boolean: string = 'and'
): this {
    [operator, value] = this.prepareValueAndOperator(value, operator, arguments.length === 2);
    
    this.wheres.push({
        type: 'ArrayLength',
        column: column,
        operator: operator,
        value: value,
        boolean: boolean
    });
    
    this.addBinding(value, 'where');
    
    return this;
}
```

---

#### Afternoon: PostgreSQL Grammar for Arrays

**File:** `/src/Query/Grammars/PostgresGrammar.ts`

```typescript
/**
 * Compile a "where array contains" clause (PostgreSQL)
 */
protected compileWhereArrayContains(query: Builder, where: any): string {
    // PostgreSQL: tags @> ARRAY['php', 'laravel']
    const column = this.wrap(where.column);
    const placeholder = this.parameter(where.values);
    
    return `${column} @> ${placeholder}::text[]`;
}

/**
 * Compile a "where array not contains" clause (PostgreSQL)
 */
protected compileWhereArrayNotContains(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const placeholder = this.parameter(where.values);
    
    return `not (${column} @> ${placeholder}::text[])`;
}

/**
 * Compile a "where array overlaps" clause (PostgreSQL)
 */
protected compileWhereArrayOverlaps(query: Builder, where: any): string {
    // PostgreSQL: tags && ARRAY['php', 'javascript']
    const column = this.wrap(where.column);
    const placeholder = this.parameter(where.values);
    
    return `${column} && ${placeholder}::text[]`;
}

/**
 * Compile a "where array not overlaps" clause (PostgreSQL)
 */
protected compileWhereArrayNotOverlaps(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const placeholder = this.parameter(where.values);
    
    return `not (${column} && ${placeholder}::text[])`;
}

/**
 * Compile a "where array length" clause (PostgreSQL)
 */
protected compileWhereArrayLength(query: Builder, where: any): string {
    // PostgreSQL: array_length(tags, 1) > 3
    const column = this.wrap(where.column);
    const operator = where.operator;
    const value = this.parameter(where.value);
    
    return `array_length(${column}, 1) ${operator} ${value}`;
}
```

**Tests:**

```typescript
describe('PostgreSQL Array Operations', () => {
    let db: any;

    beforeEach(async () => {
        db = DB.connection('pgsql');
        
        await db.schema().create('posts', (table: any) => {
            table.increments('id');
            table.string('title');
            table.specificType('tags', 'text[]');
        });
        
        await db.table('posts').insert([
            {
                title: 'Laravel Tutorial',
                tags: ['php', 'laravel', 'web']
            },
            {
                title: 'Node.js Guide',
                tags: ['javascript', 'nodejs', 'backend']
            },
            {
                title: 'Full Stack Development',
                tags: ['javascript', 'php', 'frontend', 'backend']
            }
        ]);
    });

    describe('whereArrayContains()', () => {
        it('should find posts with specific tags', async () => {
            const posts = await db.table('posts')
                .whereArrayContains('tags', ['php', 'laravel'])
                .get();
            
            expect(posts.length).toBe(1);
            expect(posts[0].title).toBe('Laravel Tutorial');
        });

        it('should work with single value', async () => {
            const posts = await db.table('posts')
                .whereArrayContains('tags', ['php'])
                .get();
            
            expect(posts.length).toBe(2);
        });
    });

    describe('whereArrayOverlaps()', () => {
        it('should find posts with overlapping tags', async () => {
            const posts = await db.table('posts')
                .whereArrayOverlaps('tags', ['php', 'python'])
                .get();
            
            expect(posts.length).toBe(2); // Laravel Tutorial and Full Stack
        });

        it('should work with no overlap', async () => {
            const posts = await db.table('posts')
                .whereArrayOverlaps('tags', ['python', 'ruby'])
                .get();
            
            expect(posts.length).toBe(0);
        });
    });

    describe('whereArrayLength()', () => {
        it('should filter by array length', async () => {
            const posts = await db.table('posts')
                .whereArrayLength('tags', '>', 3)
                .get();
            
            expect(posts.length).toBe(1);
            expect(posts[0].title).toBe('Full Stack Development');
        });

        it('should work with exact length', async () => {
            const posts = await db.table('posts')
                .whereArrayLength('tags', 3)
                .get();
            
            expect(posts.length).toBe(2);
        });
    });
});
```

---

### Day 5-6: Schema Builder Enhancements (2 days)

#### Day 5 Morning: foreignId() Helper

**Laravel Behavior:**
```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->foreignId('category_id')
          ->nullable()
          ->constrained('categories')
          ->cascadeOnDelete();
});
```

**Implementation:**

**File:** `/src/Schema/Blueprint.ts`

```typescript
/**
 * Create a foreign ID column (unsigned big integer)
 * Inspired by Laravel's Blueprint::foreignId()
 * 
 * @example
 * ```typescript
 * schema.create('posts', (table) => {
 *     table.id();
 *     table.foreignId('user_id').constrained();
 *     table.foreignId('category_id')
 *         .nullable()
 *         .constrained('categories')
 *         .cascadeOnDelete();
 * });
 * ```
 */
foreignId(column: string): ForeignIdColumnDefinition {
    // Create unsigned big integer
    const columnDef = this.unsignedBigInteger(column);
    
    // Return wrapped definition with foreign key helpers
    return new ForeignIdColumnDefinition(columnDef, this);
}

/**
 * Create a foreign UUID column
 * Inspired by Laravel's Blueprint::foreignUuid()
 */
foreignUuid(column: string): ForeignIdColumnDefinition {
    const columnDef = this.uuid(column);
    return new ForeignIdColumnDefinition(columnDef, this);
}

/**
 * Create a foreign ULID column
 * Inspired by Laravel's Blueprint::foreignUlid()
 */
foreignUlid(column: string): ForeignIdColumnDefinition {
    const columnDef = this.char(column, 26);
    return new ForeignIdColumnDefinition(columnDef, this);
}
```

**ForeignIdColumnDefinition Class:**

```typescript
/**
 * Foreign ID column definition with constraint helpers
 */
export class ForeignIdColumnDefinition {
    constructor(
        protected columnDef: ColumnDefinition,
        protected blueprint: Blueprint
    ) {}
    
    /**
     * Create a foreign key constraint
     * 
     * @example
     * ```typescript
     * table.foreignId('user_id').constrained();
     * // Creates foreign key to users.id
     * 
     * table.foreignId('author_id').constrained('users');
     * // Creates foreign key to users.id
     * 
     * table.foreignId('user_id').constrained('users', 'user_id');
     * // Creates foreign key to users.user_id
     * ```
     */
    constrained(
        table?: string,
        column: string = 'id',
        indexName?: string
    ): this {
        // Determine table name from column name if not provided
        if (!table) {
            // user_id => users
            table = this.guessTableName(this.columnDef.name);
        }
        
        // Add foreign key constraint
        this.blueprint.foreign(
            [this.columnDef.name],
            indexName
        ).references([column]).on(table);
        
        return this;
    }
    
    /**
     * Set ON DELETE CASCADE
     */
    cascadeOnDelete(): this {
        // Get the last foreign key added
        const foreignKeys = this.blueprint['foreignKeys'];
        const lastForeign = foreignKeys[foreignKeys.length - 1];
        
        if (lastForeign) {
            lastForeign.onDelete = 'cascade';
        }
        
        return this;
    }
    
    /**
     * Set ON DELETE SET NULL
     */
    nullOnDelete(): this {
        const foreignKeys = this.blueprint['foreignKeys'];
        const lastForeign = foreignKeys[foreignKeys.length - 1];
        
        if (lastForeign) {
            lastForeign.onDelete = 'set null';
        }
        
        return this;
    }
    
    /**
     * Set ON DELETE RESTRICT
     */
    restrictOnDelete(): this {
        const foreignKeys = this.blueprint['foreignKeys'];
        const lastForeign = foreignKeys[foreignKeys.length - 1];
        
        if (lastForeign) {
            lastForeign.onDelete = 'restrict';
        }
        
        return this;
    }
    
    /**
     * Set ON UPDATE CASCADE
     */
    cascadeOnUpdate(): this {
        const foreignKeys = this.blueprint['foreignKeys'];
        const lastForeign = foreignKeys[foreignKeys.length - 1];
        
        if (lastForeign) {
            lastForeign.onUpdate = 'cascade';
        }
        
        return this;
    }
    
    /**
     * Set ON UPDATE RESTRICT
     */
    restrictOnUpdate(): this {
        const foreignKeys = this.blueprint['foreignKeys'];
        const lastForeign = foreignKeys[foreignKeys.length - 1];
        
        if (lastForeign) {
            lastForeign.onUpdate = 'restrict';
        }
        
        return this;
    }
    
    /**
     * Guess table name from column name
     * user_id => users
     * category_id => categories
     */
    protected guessTableName(columnName: string): string {
        // Remove _id suffix
        const singular = columnName.replace(/_id$/, '');
        
        // Simple pluralization (can be enhanced)
        if (singular.endsWith('y')) {
            return singular.slice(0, -1) + 'ies';
        } else if (singular.endsWith('s')) {
            return singular + 'es';
        } else {
            return singular + 's';
        }
    }
    
    // Proxy all column methods
    nullable(): this {
        this.columnDef.nullable();
        return this;
    }
    
    default(value: any): this {
        this.columnDef.default(value);
        return this;
    }
    
    unique(): this {
        this.columnDef.unique();
        return this;
    }
    
    index(indexName?: string): this {
        this.columnDef.index(indexName);
        return this;
    }
    
    comment(comment: string): this {
        this.columnDef.comment(comment);
        return this;
    }
}
```

---

#### Day 5 Afternoon: change() Method for Column Modification

**Laravel Behavior:**
```php
Schema::table('users', function (Blueprint $table) {
    $table->string('email', 100)->change();
    $table->integer('votes')->unsigned()->default(0)->change();
});
```

**Implementation:**

```typescript
/**
 * Indicate that the column should be modified
 * Inspired by Laravel's ColumnDefinition::change()
 * 
 * @example
 * ```typescript
 * schema.table('users', (table) => {
 *     table.string('email', 100).change();
 *     table.integer('votes').unsigned().default(0).change();
 * });
 * ```
 */
change(): this {
    this.isChange = true;
    return this;
}

/**
 * Modify an existing column
 */
protected modifyColumn(column: ColumnDefinition): string {
    const grammar = this.grammar;
    
    // Generate ALTER COLUMN SQL based on database
    if (grammar.constructor.name === 'PostgresGrammar') {
        return this.modifyColumnPostgres(column);
    } else if (grammar.constructor.name === 'MySqlGrammar') {
        return this.modifyColumnMysql(column);
    } else if (grammar.constructor.name === 'SqliteGrammar') {
        // SQLite doesn't support ALTER COLUMN directly
        throw new Error('SQLite does not support modifying columns. Use migrations to recreate the table.');
    }
    
    throw new Error(`Column modification not supported for ${grammar.constructor.name}`);
}

/**
 * Modify column for PostgreSQL
 */
protected modifyColumnPostgres(column: ColumnDefinition): string {
    const statements: string[] = [];
    
    // ALTER COLUMN TYPE
    statements.push(
        `alter column ${this.wrap(column.name)} type ${this.getType(column)}`
    );
    
    // ALTER COLUMN SET/DROP NOT NULL
    if (column.isNullable) {
        statements.push(`alter column ${this.wrap(column.name)} drop not null`);
    } else {
        statements.push(`alter column ${this.wrap(column.name)} set not null`);
    }
    
    // ALTER COLUMN SET DEFAULT
    if (column.defaultValue !== undefined) {
        statements.push(
            `alter column ${this.wrap(column.name)} set default ${this.getDefaultValue(column.defaultValue)}`
        );
    }
    
    return statements.join(', ');
}

/**
 * Modify column for MySQL
 */
protected modifyColumnMysql(column: ColumnDefinition): string {
    // MySQL uses MODIFY COLUMN
    const definition = this.getColumnDefinition(column);
    return `modify column ${definition}`;
}
```

---

#### Day 6: renameColumn() and dropColumn() Enhancements

**Implementation:**

```typescript
/**
 * Rename a column
 * Inspired by Laravel's Blueprint::renameColumn()
 * 
 * @example
 * ```typescript
 * schema.table('users', (table) => {
 *     table.renameColumn('name', 'full_name');
 * });
 * ```
 */
renameColumn(from: string, to: string): void {
    this.commands.push({
        name: 'renameColumn',
        from: from,
        to: to
    });
}

/**
 * Drop multiple columns
 * Inspired by Laravel's Blueprint::dropColumn()
 * 
 * @example
 * ```typescript
 * schema.table('users', (table) => {
 *     table.dropColumn('votes', 'avatar', 'location');
 * });
 * ```
 */
dropColumn(...columns: string[]): void {
    for (const column of columns) {
        this.commands.push({
            name: 'dropColumn',
            column: column
        });
    }
}

/**
 * Drop a column if it exists
 */
dropColumnIfExists(column: string): void {
    this.commands.push({
        name: 'dropColumnIfExists',
        column: column
    });
}
```

**Grammar Support:**

```typescript
// PostgreSQL
protected compileRenameColumn(blueprint: Blueprint, command: any): string {
    const table = this.wrapTable(blueprint);
    const from = this.wrap(command.from);
    const to = this.wrap(command.to);
    
    return `alter table ${table} rename column ${from} to ${to}`;
}

// MySQL
protected compileRenameColumn(blueprint: Blueprint, command: any): string {
    const table = this.wrapTable(blueprint);
    
    // MySQL requires full column definition
    // This is a simplified version - full implementation needs to query existing column
    return `alter table ${table} change ${this.wrap(command.from)} ${this.wrap(command.to)} /* column definition */`;
}
```

**Complete Tests:**

```typescript
describe('Schema Builder Modern Features', () => {
    let schema: any;

    beforeEach(() => {
        schema = DB.connection('pgsql').schema();
    });

    describe('foreignId()', () => {
        it('should create foreign ID with constraint', async () => {
            await schema.create('users', (table: any) => {
                table.id();
                table.string('name');
            });
            
            await schema.create('posts', (table: any) => {
                table.id();
                table.foreignId('user_id').constrained();
            });
            
            // Verify foreign key exists
            const foreignKeys = await schema.getForeignKeys('posts');
            expect(foreignKeys.length).toBe(1);
            expect(foreignKeys[0].column).toBe('user_id');
            expect(foreignKeys[0].foreign_table).toBe('users');
        });

        it('should support cascadeOnDelete', async () => {
            await schema.create('posts', (table: any) => {
                table.id();
                table.foreignId('user_id')
                    .constrained()
                    .cascadeOnDelete();
            });
            
            const foreignKeys = await schema.getForeignKeys('posts');
            expect(foreignKeys[0].on_delete).toBe('cascade');
        });

        it('should support nullOnDelete', async () => {
            await schema.create('posts', (table: any) => {
                table.id();
                table.foreignId('user_id')
                    .nullable()
                    .constrained()
                    .nullOnDelete();
            });
            
            const foreignKeys = await schema.getForeignKeys('posts');
            expect(foreignKeys[0].on_delete).toBe('set null');
        });
    });

    describe('change()', () => {
        it('should modify existing column', async () => {
            await schema.create('users', (table: any) => {
                table.id();
                table.string('email', 50);
            });
            
            await schema.table('users', (table: any) => {
                table.string('email', 100).change();
            });
            
            const columns = await schema.getColumns('users');
            const emailColumn = columns.find((c: any) => c.name === 'email');
            expect(emailColumn.length).toBe(100);
        });

        it('should modify column nullability', async () => {
            await schema.create('users', (table: any) => {
                table.id();
                table.string('bio');
            });
            
            await schema.table('users', (table: any) => {
                table.string('bio').nullable().change();
            });
            
            const columns = await schema.getColumns('users');
            const bioColumn = columns.find((c: any) => c.name === 'bio');
            expect(bioColumn.nullable).toBe(true);
        });
    });

    describe('renameColumn()', () => {
        it('should rename a column', async () => {
            await schema.create('users', (table: any) => {
                table.id();
                table.string('name');
            });
            
            await schema.table('users', (table: any) => {
                table.renameColumn('name', 'full_name');
            });
            
            const columns = await schema.getColumns('users');
            expect(columns.some((c: any) => c.name === 'full_name')).toBe(true);
            expect(columns.some((c: any) => c.name === 'name')).toBe(false);
        });
    });
});
```

---

### Day 7: Additional Query Builder Methods (1 day)

#### Implement Missing Utility Methods

**reorder():**

```typescript
/**
 * Remove all existing orders and add a new order
 * Inspired by Laravel's Builder::reorder()
 * 
 * @example
 * ```typescript
 * query.orderBy('created_at').reorder('updated_at', 'desc');
 * // Only orders by updated_at desc
 * ```
 */
reorder(column?: string, direction: string = 'asc'): this {
    // Clear existing orders
    this.orders = [];
    this.bindings.order = [];
    
    // Add new order if column provided
    if (column) {
        return this.orderBy(column, direction);
    }
    
    return this;
}
```

**forceIndex() / forceIndexes():**

```typescript
/**
 * Force the query to use a specific index (MySQL/MariaDB)
 * Inspired by Laravel's Builder::forceIndex()
 * 
 * @example
 * ```typescript
 * await DB.table('users')
 *     .forceIndex('idx_email')
 *     .where('email', 'like', '%@gmail.com')
 *     .get();
 * ```
 */
forceIndex(...indexes: string[]): this {
    this.indexHints.push({
        type: 'force',
        indexes: indexes
    });
    
    return this;
}

/**
 * Suggest the query to use a specific index
 */
useIndex(...indexes: string[]): this {
    this.indexHints.push({
        type: 'use',
        indexes: indexes
    });
    
    return this;
}

/**
 * Tell the query to ignore a specific index
 */
ignoreIndex(...indexes: string[]): this {
    this.indexHints.push({
        type: 'ignore',
        indexes: indexes
    });
    
    return this;
}
```

---

## Testing Strategy (Day 8-9: 2 days)

### Day 8: Comprehensive Unit Tests

Run all Phase 4 tests:

```bash
cd /Users/rishi/Desktop/work/GuruORM

# All Phase 4 tests
npm test -- Phase4

# Specific test suites
npm test -- QueryBuilderHaving
npm test -- QueryBuilderJSON
npm test -- PostgresArrays
npm test -- SchemaModern
```

### Day 9: Cross-Database Integration Tests

Test all features across all supported databases:

```typescript
describe('Phase 4 Cross-Database Tests', () => {
    const databases = ['pgsql', 'mysql', 'sqlite'];
    
    for (const dbName of databases) {
        describe(`${dbName} database`, () => {
            let db: any;
            
            beforeEach(() => {
                db = DB.connection(dbName);
            });
            
            describe('having null methods', () => {
                it('should work correctly', async () => {
                    // Test implementation
                });
            });
            
            if (dbName !== 'sqlite') {
                describe('JSON operations', () => {
                    it('should work correctly', async () => {
                        // Test implementation
                    });
                });
            }
            
            if (dbName === 'pgsql') {
                describe('array operations', () => {
                    it('should work correctly', async () => {
                        // Test implementation
                    });
                });
            }
        });
    }
});
```

---

## Documentation Updates

Update these files:
- `docs/query-builder.md` - Add having null, JSON, array methods
- `docs/schema.md` - Add foreignId(), change(), renameColumn()
- `docs/migrations.md` - Add examples of column modification

---

## Success Criteria

### Implementation
- [ ] havingNull() family implemented (4 methods)
- [ ] JSON methods implemented (whereJsonContainsKey, whereJsonLength)
- [ ] PostgreSQL array methods implemented (3 methods)
- [ ] foreignId() with constraint helpers
- [ ] change() method for column modification
- [ ] renameColumn() and enhanced dropColumn()
- [ ] All grammar support complete

### Testing
- [ ] Unit tests 100% pass
- [ ] Cross-database tests pass
- [ ] Integration tests with neasto pass
- [ ] No performance regression

### Documentation
- [ ] All methods documented
- [ ] Migration examples added
- [ ] CHANGELOG updated

---

## Timeline Summary

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | Having Null Methods | havingNull() family + tests |
| 2 | JSON Methods Part 1 | whereJsonContainsKey() + grammar |
| 3 | JSON Methods Part 2 | whereJsonLength() + tests |
| 4 | PostgreSQL Arrays | whereArrayContains(), whereArrayOverlaps() |
| 5 | Schema foreignId() | foreignId() with constraint helpers |
| 6 | Schema change/rename | change(), renameColumn() |
| 7 | Additional Methods | reorder(), forceIndex() |
| 8 | Unit Testing | Complete coverage |
| 9 | Integration Testing | Cross-database tests |

**Total:** 9 days  
**Phase 4 Completion:** February 14, 2026
