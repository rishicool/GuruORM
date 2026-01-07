# Phase 1: Critical Features

**Duration:** 10 days + 2 days testing  
**Priority:** CRITICAL  
**Version:** 2.0.14 → 2.1.0-beta.1

---

## Overview

Phase 1 implements the most critical missing features that are essential for Laravel parity and commonly used in production applications. These features are blocking many developers from fully adopting GuruORM.

---

## Features

### 1. DB.transaction() Static Wrapper (2 days)

**Current State:**
- ✅ Connection.transaction() exists and works
- ✅ Manager has instance method transaction()
- ❌ No static DB.transaction() wrapper like Laravel

**Laravel Behavior:**
```php
use Illuminate\Support\Facades\DB;

DB::transaction(function () {
    $user = User::create(['name' => 'John']);
    Order::create(['user_id' => $user->id]);
    // Auto-commit on success
    // Auto-rollback on exception
});

// With attempts
DB::transaction(function () {
    // ...
}, 5); // Retry up to 5 times on deadlock
```

**GuruORM Target:**
```typescript
import { DB } from 'guruorm';

await DB.transaction(async () => {
    const user = await User.create({ name: 'John' });
    await Order.create({ user_id: user.id });
    // Auto-commit on success
    // Auto-rollback on exception
});

// With attempts
await DB.transaction(async () => {
    // ...
}, 5); // Retry up to 5 times on deadlock
```

**Implementation Plan:**

#### Step 1.1: Create DB Facade (Day 1)
**File:** `/src/Facades/DB.ts`

```typescript
import { Manager } from '../Capsule/Manager';
import { Builder as QueryBuilder } from '../Query/Builder';
import { Builder as SchemaBuilder } from '../Schema/Builder';

/**
 * DB Facade - Laravel-style static interface
 * Inspired by Illuminate\Support\Facades\DB
 */
export class DB {
    /**
     * Begin a fluent query against a database table
     */
    static table(table: string, as?: string, connection?: string): QueryBuilder {
        return Manager.table(table, as, connection);
    }

    /**
     * Get a schema builder instance
     */
    static schema(connection?: string): SchemaBuilder {
        return Manager.schema(connection);
    }

    /**
     * Run a select statement
     */
    static async select(query: string, bindings: any[] = [], connection?: string): Promise<any[]> {
        return Manager.select(query, bindings, connection);
    }

    /**
     * Run an insert statement
     */
    static async insert(query: string, bindings: any[] = [], connection?: string): Promise<boolean> {
        return Manager.insert(query, bindings, connection);
    }

    /**
     * Run an update statement
     */
    static async update(query: string, bindings: any[] = [], connection?: string): Promise<number> {
        return Manager.update(query, bindings, connection);
    }

    /**
     * Run a delete statement
     */
    static async delete(query: string, bindings: any[] = [], connection?: string): Promise<number> {
        return Manager.delete(query, bindings, connection);
    }

    /**
     * Execute a statement
     */
    static async statement(query: string, bindings: any[] = [], connection?: string): Promise<boolean> {
        return Manager.statement(query, bindings, connection);
    }

    /**
     * Execute a Closure within a transaction
     * 
     * @param callback Transaction callback
     * @param attempts Number of retry attempts on deadlock (default: 1)
     * @param connection Connection name (optional)
     */
    static async transaction<T>(
        callback: () => Promise<T>,
        attempts: number = 1,
        connection?: string
    ): Promise<T> {
        const conn = Manager.getInstance().getConnection(connection);
        
        for (let currentAttempt = 1; currentAttempt <= attempts; currentAttempt++) {
            try {
                return await conn.transaction(callback);
            } catch (error: any) {
                // Check if it's a deadlock error
                const isDeadlock = this.causedByDeadlock(error);
                
                if (isDeadlock && currentAttempt < attempts) {
                    // Wait before retry (exponential backoff)
                    await this.sleep(Math.pow(2, currentAttempt) * 100);
                    continue;
                }
                
                // Not a deadlock or out of attempts
                throw error;
            }
        }
        
        throw new Error('Transaction failed after maximum attempts');
    }

    /**
     * Start a new database transaction
     */
    static async beginTransaction(connection?: string): Promise<void> {
        const conn = Manager.getInstance().getConnection(connection);
        await conn.beginTransaction();
    }

    /**
     * Commit the active database transaction
     */
    static async commit(connection?: string): Promise<void> {
        const conn = Manager.getInstance().getConnection(connection);
        await conn.commit();
    }

    /**
     * Rollback the active database transaction
     */
    static async rollBack(toLevel?: number, connection?: string): Promise<void> {
        const conn = Manager.getInstance().getConnection(connection);
        await conn.rollback(toLevel ?? null);
    }

    /**
     * Get the number of active transactions
     */
    static transactionLevel(connection?: string): number {
        const conn = Manager.getInstance().getConnection(connection);
        return conn.transactionLevel();
    }

    /**
     * Determine if the given exception was caused by a deadlock
     */
    protected static causedByDeadlock(error: any): boolean {
        const message = error.message || '';
        
        return message.includes('Deadlock') ||
               message.includes('deadlock') ||
               message.includes('1213') || // MySQL deadlock code
               message.includes('40001') || // PostgreSQL deadlock code
               message.includes('1205'); // SQL Server deadlock code
    }

    /**
     * Sleep for the given number of milliseconds
     */
    protected static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get a database connection instance
     */
    static connection(name?: string): any {
        return Manager.getInstance().connection(name);
    }

    /**
     * Disconnect from the given database
     */
    static async disconnect(name?: string): Promise<void> {
        return Manager.disconnect(name);
    }

    /**
     * Get the database connection configuration
     */
    static getConfig(name?: string): any {
        return Manager.getInstance().connection(name).getConfig();
    }

    /**
     * Enable query logging
     */
    static enableQueryLog(connection?: string): void {
        Manager.getInstance().connection(connection).enableQueryLog();
    }

    /**
     * Disable query logging
     */
    static disableQueryLog(connection?: string): void {
        Manager.getInstance().connection(connection).disableQueryLog();
    }

    /**
     * Get the query log
     */
    static getQueryLog(connection?: string): any[] {
        return Manager.getInstance().connection(connection).getQueryLog();
    }

    /**
     * Clear the query log
     */
    static flushQueryLog(connection?: string): void {
        return Manager.getInstance().connection(connection).flushQueryLog();
    }

    /**
     * Log a query
     */
    static listen(callback: (query: any) => void, connection?: string): void {
        // Implementation for query event listener
        // This will be implemented in Phase 4
    }
}
```

#### Step 1.2: Export DB Facade (Day 1)
**File:** `/src/index.ts`

Add to exports:
```typescript
export { DB } from './Facades/DB';
```

#### Step 1.3: Write Tests (Day 2)
**File:** `/tests/unit/Facades/DB.test.ts`

```typescript
import { DB } from '../../../src/Facades/DB';
import { Manager } from '../../../src/Capsule/Manager';

describe('DB Facade', () => {
    beforeAll(() => {
        const manager = new Manager();
        manager.addConnection({
            driver: 'sqlite',
            database: ':memory:',
        });
        manager.setAsGlobal();
        manager.bootEloquent();
    });

    describe('transaction()', () => {
        it('should commit transaction on success', async () => {
            let executed = false;
            
            await DB.transaction(async () => {
                executed = true;
            });
            
            expect(executed).toBe(true);
        });

        it('should rollback transaction on error', async () => {
            let executed = false;
            
            await expect(async () => {
                await DB.transaction(async () => {
                    executed = true;
                    throw new Error('Test error');
                });
            }).rejects.toThrow('Test error');
            
            expect(executed).toBe(true);
        });

        it('should retry on deadlock', async () => {
            let attempts = 0;
            
            await expect(async () => {
                await DB.transaction(async () => {
                    attempts++;
                    const error: any = new Error('Deadlock found');
                    error.code = 1213;
                    throw error;
                }, 3);
            }).rejects.toThrow();
            
            expect(attempts).toBe(3);
        });

        it('should not retry on non-deadlock errors', async () => {
            let attempts = 0;
            
            await expect(async () => {
                await DB.transaction(async () => {
                    attempts++;
                    throw new Error('Regular error');
                }, 3);
            }).rejects.toThrow('Regular error');
            
            expect(attempts).toBe(1);
        });
    });

    describe('manual transaction methods', () => {
        it('should begin, commit, and rollback transactions', async () => {
            await DB.beginTransaction();
            expect(DB.transactionLevel()).toBe(1);
            
            await DB.commit();
            expect(DB.transactionLevel()).toBe(0);
            
            await DB.beginTransaction();
            await DB.rollBack();
            expect(DB.transactionLevel()).toBe(0);
        });
    });
});
```

**Success Criteria:**
- ✅ DB.transaction() works exactly like Laravel
- ✅ Auto-commit on success
- ✅ Auto-rollback on exception
- ✅ Retry on deadlock with exponential backoff
- ✅ Manual transaction control works
- ✅ All tests pass
- ✅ Documented with examples

---

### 2. BelongsToMany wherePivot Methods (3 days)

**Current State:**
- ✅ BelongsToMany relationship works
- ✅ attach(), detach(), sync() work
- ❌ No wherePivot() methods
- ❌ No orderByPivot() method

**Laravel Behavior:**
```php
$user->roles()
    ->wherePivot('active', true)
    ->wherePivotIn('status', [1, 2, 3])
    ->wherePivotNull('deleted_at')
    ->wherePivotBetween('created_at', [$start, $end])
    ->orderByPivot('created_at', 'desc')
    ->get();
```

**GuruORM Target:**
```typescript
await user.roles()
    .wherePivot('active', true)
    .wherePivotIn('status', [1, 2, 3])
    .wherePivotNull('deleted_at')
    .wherePivotBetween('created_at', [start, end])
    .orderByPivot('created_at', 'desc')
    .get();
```

**Implementation Plan:**

#### Step 2.1: Add wherePivot Methods (Day 1-2)
**File:** `/src/Eloquent/Relations/BelongsToMany.ts`

Add after existing methods:

```typescript
/**
 * Set a where clause for a pivot table column
 */
wherePivot(column: string, operator: any, value?: any): this {
    return this.where(`${this.table}.${column}`, operator, value);
}

/**
 * Set an or where clause for a pivot table column
 */
orWherePivot(column: string, operator: any, value?: any): this {
    return this.orWhere(`${this.table}.${column}`, operator, value);
}

/**
 * Set a where clause for a pivot table column (in array)
 */
wherePivotIn(column: string, values: any[]): this {
    return this.whereIn(`${this.table}.${column}`, values);
}

/**
 * Set an or where clause for a pivot table column (in array)
 */
orWherePivotIn(column: string, values: any[]): this {
    return this.orWhereIn(`${this.table}.${column}`, values);
}

/**
 * Set a where clause for a pivot table column (not in array)
 */
wherePivotNotIn(column: string, values: any[]): this {
    return this.whereNotIn(`${this.table}.${column}`, values);
}

/**
 * Set an or where clause for a pivot table column (not in array)
 */
orWherePivotNotIn(column: string, values: any[]): this {
    return this.orWhereNotIn(`${this.table}.${column}`, values);
}

/**
 * Set a where clause for a pivot table column is null
 */
wherePivotNull(column: string): this {
    return this.whereNull(`${this.table}.${column}`);
}

/**
 * Set an or where clause for a pivot table column is null
 */
orWherePivotNull(column: string): this {
    return this.orWhereNull(`${this.table}.${column}`);
}

/**
 * Set a where clause for a pivot table column is not null
 */
wherePivotNotNull(column: string): this {
    return this.whereNotNull(`${this.table}.${column}`);
}

/**
 * Set an or where clause for a pivot table column is not null
 */
orWherePivotNotNull(column: string): this {
    return this.orWhereNotNull(`${this.table}.${column}`);
}

/**
 * Set a where clause for a pivot table column between two values
 */
wherePivotBetween(column: string, values: [any, any]): this {
    return this.whereBetween(`${this.table}.${column}`, values);
}

/**
 * Set an or where clause for a pivot table column between two values
 */
orWherePivotBetween(column: string, values: [any, any]): this {
    return this.orWhereBetween(`${this.table}.${column}`, values);
}

/**
 * Set a where clause for a pivot table column not between two values
 */
wherePivotNotBetween(column: string, values: [any, any]): this {
    return this.whereNotBetween(`${this.table}.${column}`, values);
}

/**
 * Set an or where clause for a pivot table column not between two values
 */
orWherePivotNotBetween(column: string, values: [any, any]): this {
    return this.orWhereNotBetween(`${this.table}.${column}`, values);
}

/**
 * Order the query by a pivot table column
 */
orderByPivot(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    return this.orderBy(`${this.table}.${column}`, direction);
}
```

#### Step 2.2: Write Tests (Day 3)
**File:** `/tests/unit/Eloquent/Relations/BelongsToManyPivot.test.ts`

```typescript
describe('BelongsToMany Pivot Methods', () => {
    it('should add wherePivot clause', async () => {
        const query = user.roles().wherePivot('active', true);
        const sql = query.toSql();
        
        expect(sql).toContain('role_user.active = ?');
    });

    it('should add wherePivotIn clause', async () => {
        const query = user.roles().wherePivotIn('status', [1, 2, 3]);
        const sql = query.toSql();
        
        expect(sql).toContain('role_user.status in (?, ?, ?)');
    });

    it('should add wherePivotNull clause', async () => {
        const query = user.roles().wherePivotNull('deleted_at');
        const sql = query.toSql();
        
        expect(sql).toContain('role_user.deleted_at is null');
    });

    it('should add wherePivotBetween clause', async () => {
        const query = user.roles().wherePivotBetween('created_at', [start, end]);
        const sql = query.toSql();
        
        expect(sql).toContain('role_user.created_at between ? and ?');
    });

    it('should add orderByPivot clause', async () => {
        const query = user.roles().orderByPivot('created_at', 'desc');
        const sql = query.toSql();
        
        expect(sql).toContain('order by role_user.created_at desc');
    });

    it('should chain multiple pivot clauses', async () => {
        const query = user.roles()
            .wherePivot('active', true)
            .wherePivotNotNull('approved_at')
            .orderByPivot('created_at', 'desc');
        
        const sql = query.toSql();
        
        expect(sql).toContain('role_user.active = ?');
        expect(sql).toContain('role_user.approved_at is not null');
        expect(sql).toContain('order by role_user.created_at desc');
    });
});
```

**Success Criteria:**
- ✅ All wherePivot methods generate correct SQL
- ✅ Works with all pivot table queries
- ✅ Chainable with other query methods
- ✅ orderByPivot works correctly
- ✅ All tests pass
- ✅ Works across all database drivers

---

### 3. Model refresh() and fresh() (1 day)

**Current State:**
- ❌ No refresh() method
- ❌ No fresh() method

**Laravel Behavior:**
```php
$user = User::find(1);
$user->name = 'Updated';

// Reload from database (updates current instance)
$user->refresh();
echo $user->name; // Original value from database

// Get fresh instance (returns new instance)
$freshUser = $user->fresh();
echo $freshUser->name; // Original value from database
```

**GuruORM Target:**
```typescript
const user = await User.find(1);
user.name = 'Updated';

// Reload from database (updates current instance)
await user.refresh();
console.log(user.name); // Original value from database

// Get fresh instance (returns new instance)
const freshUser = await user.fresh();
console.log(freshUser.name); // Original value from database
```

**Implementation Plan:**

#### Step 3.1: Add Methods to Model (Day 1 - Morning)
**File:** `/src/Eloquent/Model.ts`

Add after save() method:

```typescript
/**
 * Reload the current model instance from the database
 * Inspired by Laravel's Model::refresh()
 */
async refresh(): Promise<this> {
    if (!this.exists) {
        throw new Error('Cannot refresh a model that does not exist in the database');
    }

    const key = this.getKey();
    if (!key) {
        throw new Error('Cannot refresh a model without a primary key value');
    }

    // Query the database for fresh data
    const fresh = await this.newQuery().find(key);

    if (!fresh) {
        throw new Error(`Model with key ${key} not found in database`);
    }

    // Update current instance attributes
    this.attributes = { ...fresh.getAttributes() };
    this.original = { ...fresh.getAttributes() };
    this.relations = {};
    this.syncOriginal();

    return this;
}

/**
 * Reload the current model instance with fresh attributes and relations
 * Inspired by Laravel's Model::refresh()
 */
async refreshWith(...relations: string[]): Promise<this> {
    await this.refresh();

    if (relations.length > 0) {
        await this.load(relations);
    }

    return this;
}

/**
 * Get a fresh instance of the model from the database
 * Inspired by Laravel's Model::fresh()
 */
async fresh(columns: string[] = ['*']): Promise<this | null> {
    if (!this.exists) {
        return null;
    }

    const key = this.getKey();
    if (!key) {
        return null;
    }

    return this.newQuery().find(key, columns) as Promise<this | null>;
}

/**
 * Get a fresh instance with specific relations loaded
 * Inspired by Laravel's Model::fresh()
 */
async freshWith(relations: string[], columns: string[] = ['*']): Promise<this | null> {
    const fresh = await this.fresh(columns);

    if (fresh && relations.length > 0) {
        await fresh.load(relations);
    }

    return fresh;
}
```

#### Step 3.2: Write Tests (Day 1 - Afternoon)
**File:** `/tests/unit/Eloquent/ModelRefresh.test.ts`

```typescript
describe('Model refresh() and fresh()', () => {
    describe('refresh()', () => {
        it('should reload model from database', async () => {
            const user = await User.create({ name: 'John', email: 'john@example.com' });
            
            // Modify in memory
            user.name = 'Jane';
            expect(user.name).toBe('Jane');
            
            // Reload from database
            await user.refresh();
            expect(user.name).toBe('John');
        });

        it('should throw error if model does not exist', async () => {
            const user = new User({ name: 'John' });
            
            await expect(user.refresh()).rejects.toThrow(
                'Cannot refresh a model that does not exist in the database'
            );
        });

        it('should clear relations on refresh', async () => {
            const user = await User.query().with('posts').first();
            expect(user.relations.posts).toBeDefined();
            
            await user.refresh();
            expect(user.relations.posts).toBeUndefined();
        });

        it('should refresh with relations', async () => {
            const user = await User.query().with('posts').first();
            
            user.name = 'Updated';
            await user.refreshWith('posts', 'comments');
            
            expect(user.name).not.toBe('Updated');
            expect(user.relations.posts).toBeDefined();
            expect(user.relations.comments).toBeDefined();
        });
    });

    describe('fresh()', () => {
        it('should return fresh instance from database', async () => {
            const user = await User.create({ name: 'John', email: 'john@example.com' });
            
            // Modify in memory
            user.name = 'Jane';
            expect(user.name).toBe('Jane');
            
            // Get fresh instance
            const fresh = await user.fresh();
            expect(fresh?.name).toBe('John');
            expect(user.name).toBe('Jane'); // Original unchanged
        });

        it('should return null if model does not exist', async () => {
            const user = new User({ name: 'John' });
            
            const fresh = await user.fresh();
            expect(fresh).toBeNull();
        });

        it('should load specific columns', async () => {
            const user = await User.create({ 
                name: 'John', 
                email: 'john@example.com',
                age: 30
            });
            
            const fresh = await user.fresh(['name', 'email']);
            expect(fresh?.name).toBe('John');
            expect(fresh?.email).toBe('john@example.com');
        });

        it('should load with relations', async () => {
            const user = await User.query().with('posts').first();
            
            const fresh = await user.freshWith(['posts', 'comments']);
            expect(fresh?.relations.posts).toBeDefined();
            expect(fresh?.relations.comments).toBeDefined();
        });
    });
});
```

**Success Criteria:**
- ✅ refresh() reloads current instance from database
- ✅ fresh() returns new instance from database
- ✅ refreshWith() and freshWith() load relations
- ✅ Proper error handling
- ✅ All tests pass
- ✅ Works across all database drivers

---

### 4. Schema Introspection (2 days)

**Current State:**
- ❌ No hasTable() method
- ❌ No hasColumn() method
- ❌ No getColumnType() method
- ❌ No getColumnListing() method

**Laravel Behavior:**
```php
use Illuminate\Support\Facades\Schema;

// Check if table exists
if (Schema::hasTable('users')) {
    // ...
}

// Check if column exists
if (Schema::hasColumn('users', 'email')) {
    // ...
}

// Get column type
$type = Schema::getColumnType('users', 'email'); // 'string'

// Get all columns
$columns = Schema::getColumnListing('users');
// ['id', 'name', 'email', 'created_at', 'updated_at']
```

**GuruORM Target:**
```typescript
import { DB } from 'guruorm';

// Check if table exists
if (await DB.schema().hasTable('users')) {
    // ...
}

// Check if column exists
if (await DB.schema().hasColumn('users', 'email')) {
    // ...
}

// Get column type
const type = await DB.schema().getColumnType('users', 'email'); // 'string'

// Get all columns
const columns = await DB.schema().getColumnListing('users');
// ['id', 'name', 'email', 'created_at', 'updated_at']
```

**Implementation Plan:**

#### Step 4.1: Add Schema Introspection Methods (Day 1)
**File:** `/src/Schema/Builder.ts`

Add after existing methods:

```typescript
/**
 * Determine if the given table exists
 */
async hasTable(table: string): Promise<boolean> {
    table = this.connection.getTablePrefix() + table;
    
    return this.grammar.compileTableExists(this.connection, table);
}

/**
 * Determine if the given table has a given column
 */
async hasColumn(table: string, column: string): Promise<boolean> {
    table = this.connection.getTablePrefix() + table;
    
    const columns = await this.getColumnListing(table);
    return columns.includes(column);
}

/**
 * Determine if the given table has given columns
 */
async hasColumns(table: string, columns: string[]): Promise<boolean> {
    table = this.connection.getTablePrefix() + table;
    
    const tableColumns = await this.getColumnListing(table);
    
    for (const column of columns) {
        if (!tableColumns.includes(column)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get the data type for the given column
 */
async getColumnType(table: string, column: string): Promise<string> {
    table = this.connection.getTablePrefix() + table;
    
    return this.grammar.compileColumnType(this.connection, table, column);
}

/**
 * Get the column listing for a given table
 */
async getColumnListing(table: string): Promise<string[]> {
    table = this.connection.getTablePrefix() + table;
    
    return this.grammar.compileColumnListing(this.connection, table);
}

/**
 * Get the full column definitions for a given table
 */
async getColumns(table: string): Promise<Array<{
    name: string;
    type: string;
    nullable: boolean;
    default: any;
}>> {
    table = this.connection.getTablePrefix() + table;
    
    return this.grammar.compileColumns(this.connection, table);
}

/**
 * Get the indexes for a given table
 */
async getIndexes(table: string): Promise<Array<{
    name: string;
    columns: string[];
    type: string;
    unique: boolean;
}>> {
    table = this.connection.getTablePrefix() + table;
    
    return this.grammar.compileIndexes(this.connection, table);
}

/**
 * Get the foreign keys for a given table
 */
async getForeignKeys(table: string): Promise<Array<{
    name: string;
    columns: string[];
    foreign_table: string;
    foreign_columns: string[];
    on_update: string;
    on_delete: string;
}>> {
    table = this.connection.getTablePrefix() + table;
    
    return this.grammar.compileForeignKeys(this.connection, table);
}
```

#### Step 4.2: Implement Grammar Methods (Day 1-2)
**Files:** 
- `/src/Schema/Grammars/PostgresGrammar.ts`
- `/src/Schema/Grammars/MySqlGrammar.ts`
- `/src/Schema/Grammars/SqliteGrammar.ts`
- `/src/Schema/Grammars/SqlServerGrammar.ts`

Each grammar needs to implement these methods. Example for PostgreSQL:

```typescript
/**
 * Compile the query to determine if a table exists
 */
async compileTableExists(connection: any, table: string): Promise<boolean> {
    const result = await connection.select(
        `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ?
        ) as exists`,
        [table]
    );
    
    return result[0]?.exists === true || result[0]?.exists === 1;
}

/**
 * Compile the query to get column listing
 */
async compileColumnListing(connection: any, table: string): Promise<string[]> {
    const results = await connection.select(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = ? 
         ORDER BY ordinal_position`,
        [table]
    );
    
    return results.map((row: any) => row.column_name);
}

/**
 * Compile the query to get column type
 */
async compileColumnType(connection: any, table: string, column: string): Promise<string> {
    const result = await connection.select(
        `SELECT data_type 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = ? 
         AND column_name = ?`,
        [table, column]
    );
    
    if (!result[0]) {
        throw new Error(`Column ${column} does not exist on table ${table}`);
    }
    
    return this.mapColumnType(result[0].data_type);
}

/**
 * Map database column type to Laravel/GuruORM type
 */
protected mapColumnType(type: string): string {
    const typeMap: Record<string, string> = {
        'integer': 'integer',
        'bigint': 'bigInteger',
        'smallint': 'smallInteger',
        'boolean': 'boolean',
        'character varying': 'string',
        'varchar': 'string',
        'text': 'text',
        'timestamp': 'timestamp',
        'date': 'date',
        'time': 'time',
        'json': 'json',
        'jsonb': 'jsonb',
        'uuid': 'uuid',
        'numeric': 'decimal',
        'double precision': 'double',
        'real': 'float',
    };
    
    return typeMap[type] || type;
}

/**
 * Compile the query to get full column definitions
 */
async compileColumns(connection: any, table: string): Promise<any[]> {
    const results = await connection.select(
        `SELECT 
            column_name as name,
            data_type as type,
            is_nullable as nullable,
            column_default as "default"
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = ? 
         ORDER BY ordinal_position`,
        [table]
    );
    
    return results.map((row: any) => ({
        name: row.name,
        type: this.mapColumnType(row.type),
        nullable: row.nullable === 'YES',
        default: row.default,
    }));
}
```

#### Step 4.3: Write Tests (Day 2)
**File:** `/tests/unit/Schema/SchemaIntrospection.test.ts`

```typescript
describe('Schema Introspection', () => {
    beforeAll(async () => {
        await DB.schema().create('test_users', (table) => {
            table.id();
            table.string('name');
            table.string('email').unique();
            table.integer('age').nullable();
            table.timestamps();
        });
    });

    afterAll(async () => {
        await DB.schema().dropIfExists('test_users');
    });

    describe('hasTable()', () => {
        it('should return true for existing table', async () => {
            const exists = await DB.schema().hasTable('test_users');
            expect(exists).toBe(true);
        });

        it('should return false for non-existing table', async () => {
            const exists = await DB.schema().hasTable('non_existent_table');
            expect(exists).toBe(false);
        });
    });

    describe('hasColumn()', () => {
        it('should return true for existing column', async () => {
            const exists = await DB.schema().hasColumn('test_users', 'name');
            expect(exists).toBe(true);
        });

        it('should return false for non-existing column', async () => {
            const exists = await DB.schema().hasColumn('test_users', 'non_existent');
            expect(exists).toBe(false);
        });
    });

    describe('getColumnType()', () => {
        it('should return correct column type', async () => {
            const type = await DB.schema().getColumnType('test_users', 'name');
            expect(type).toBe('string');
        });

        it('should throw for non-existing column', async () => {
            await expect(
                DB.schema().getColumnType('test_users', 'non_existent')
            ).rejects.toThrow();
        });
    });

    describe('getColumnListing()', () => {
        it('should return all columns', async () => {
            const columns = await DB.schema().getColumnListing('test_users');
            expect(columns).toContain('id');
            expect(columns).toContain('name');
            expect(columns).toContain('email');
            expect(columns).toContain('age');
            expect(columns).toContain('created_at');
            expect(columns).toContain('updated_at');
        });
    });
});
```

**Success Criteria:**
- ✅ hasTable() works across all databases
- ✅ hasColumn() works across all databases
- ✅ getColumnType() returns correct types
- ✅ getColumnListing() returns all columns
- ✅ All tests pass
- ✅ Works with table prefixes

---

### 5. Model replicate() (1 day)

**Current State:**
- ❌ No replicate() method

**Laravel Behavior:**
```php
$user = User::find(1);

// Clone model without saving
$duplicate = $user->replicate();
$duplicate->email = 'new@example.com';
$duplicate->save();

// Replicate without specific attributes
$duplicate = $user->replicate(['email']);
```

**GuruORM Target:**
```typescript
const user = await User.find(1);

// Clone model without saving
const duplicate = user.replicate();
duplicate.email = 'new@example.com';
await duplicate.save();

// Replicate without specific attributes
const duplicate = user.replicate(['email']);
```

**Implementation Plan:**

#### Step 5.1: Add replicate() Method (Day 1 - Morning)
**File:** `/src/Eloquent/Model.ts`

Add after fresh() method:

```typescript
/**
 * Clone the model into a new, non-existing instance
 * Inspired by Laravel's Model::replicate()
 */
replicate(except: string[] = []): this {
    const attributes = { ...this.getAttributes() };
    
    // Remove primary key
    delete attributes[this.getKeyName()];
    
    // Remove specified attributes
    for (const attribute of except) {
        delete attributes[attribute];
    }
    
    // Remove timestamps if they're set to auto-update
    if (this.timestamps) {
        delete attributes[this.getCreatedAtColumn()];
        delete attributes[this.getUpdatedAtColumn()];
    }
    
    // Create new instance
    const replica = this.newInstance(attributes, false);
    
    // Copy relations
    replica.setRelations(this.relations);
    
    return replica;
}

/**
 * Clone the model into a new instance with specific relations
 */
replicateWithRelations(relations: string[], except: string[] = []): this {
    const replica = this.replicate(except);
    
    // Keep only specified relations
    const replicaRelations: Record<string, any> = {};
    for (const relation of relations) {
        if (this.relations[relation]) {
            replicaRelations[relation] = this.relations[relation];
        }
    }
    
    replica.setRelations(replicaRelations);
    
    return replica;
}
```

#### Step 5.2: Write Tests (Day 1 - Afternoon)
**File:** `/tests/unit/Eloquent/ModelReplicate.test.ts`

```typescript
describe('Model replicate()', () => {
    it('should clone model without primary key', async () => {
        const user = await User.create({ 
            name: 'John', 
            email: 'john@example.com' 
        });
        
        const duplicate = user.replicate();
        
        expect(duplicate.name).toBe('John');
        expect(duplicate.email).toBe('john@example.com');
        expect(duplicate.id).toBeUndefined();
        expect(duplicate.exists).toBe(false);
    });

    it('should clone without specified attributes', async () => {
        const user = await User.create({ 
            name: 'John', 
            email: 'john@example.com',
            age: 30
        });
        
        const duplicate = user.replicate(['email', 'age']);
        
        expect(duplicate.name).toBe('John');
        expect(duplicate.email).toBeUndefined();
        expect(duplicate.age).toBeUndefined();
    });

    it('should remove timestamps', async () => {
        const user = await User.create({ name: 'John' });
        
        const duplicate = user.replicate();
        
        expect(duplicate.created_at).toBeUndefined();
        expect(duplicate.updated_at).toBeUndefined();
    });

    it('should allow saving replicated model', async () => {
        const user = await User.create({ 
            name: 'John', 
            email: 'john@example.com' 
        });
        
        const duplicate = user.replicate();
        duplicate.email = 'duplicate@example.com';
        await duplicate.save();
        
        expect(duplicate.id).toBeDefined();
        expect(duplicate.id).not.toBe(user.id);
        expect(duplicate.exists).toBe(true);
    });

    it('should copy relations', async () => {
        const user = await User.query().with('posts').first();
        
        const duplicate = user.replicate();
        
        expect(duplicate.relations.posts).toBeDefined();
        expect(duplicate.relations.posts).toBe(user.relations.posts);
    });

    it('should replicate with specific relations', async () => {
        const user = await User.query().with(['posts', 'comments']).first();
        
        const duplicate = user.replicateWithRelations(['posts']);
        
        expect(duplicate.relations.posts).toBeDefined();
        expect(duplicate.relations.comments).toBeUndefined();
    });
});
```

**Success Criteria:**
- ✅ replicate() creates new instance without saving
- ✅ Primary key is removed
- ✅ Timestamps are removed
- ✅ Can exclude specific attributes
- ✅ Relations are copied
- ✅ Can save replicated model
- ✅ All tests pass

---

## Testing Plan

### Unit Tests
- DB Facade transaction methods
- BelongsToMany wherePivot methods
- Model refresh/fresh methods
- Schema introspection methods
- Model replicate method

### Integration Tests
- Test DB.transaction() with real database
- Test wherePivot with actual many-to-many relationships
- Test refresh/fresh with related models
- Test schema introspection across all database drivers
- Test replicate with complex models

### Regression Tests
- Run against neasto project (45 seeders)
- Run against vasuzex-v2 models
- Test lara-backend usage patterns
- Ensure all existing tests pass

---

## Documentation

### Code Documentation
- JSDoc comments for all new methods
- TypeScript types for all parameters
- Usage examples in comments

### User Documentation
- Update docs/query-builder.md for DB facade
- Update docs/relationships.md for wherePivot methods
- Update docs/eloquent.md for refresh/fresh/replicate
- Create docs/schema-introspection.md
- Update docs/advanced.md for transactions

### CHANGELOG
```markdown
## [2.1.0-beta.1] - 2026-01-16

### Added
- DB facade with transaction() static method
- BelongsToMany wherePivot() family methods
- Model refresh() and fresh() methods
- Schema introspection: hasTable(), hasColumn(), getColumnType(), getColumnListing()
- Model replicate() method

### Fixed
- Transaction retry on deadlock with exponential backoff
```

---

## Success Criteria Checklist

- [ ] DB.transaction() implemented and tested
- [ ] All wherePivot methods implemented and tested
- [ ] Model refresh() and fresh() implemented and tested
- [ ] Schema introspection methods implemented and tested
- [ ] Model replicate() implemented and tested
- [ ] All unit tests pass (100% coverage for new code)
- [ ] All integration tests pass
- [ ] All regression tests pass
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] Code review complete
- [ ] Ready for beta release

---

## Estimated Timeline

| Task | Duration | Completion Date |
|------|----------|-----------------|
| DB.transaction() | 2 days | Jan 8, 2026 |
| wherePivot methods | 3 days | Jan 11, 2026 |
| refresh/fresh | 1 day | Jan 12, 2026 |
| Schema introspection | 2 days | Jan 14, 2026 |
| replicate() | 1 day | Jan 15, 2026 |
| Testing & fixes | 2 days | Jan 17, 2026 |
| Documentation | 1 day | Jan 18, 2026 |

**Total:** 12 days (including testing & documentation)  
**Phase 1 Completion:** January 18, 2026

---

## Next Steps

After Phase 1 completion:
1. Publish `2.1.0-beta.1`
2. Gather community feedback
3. Fix any issues
4. Proceed to Phase 2 (Collection Enhancement)
