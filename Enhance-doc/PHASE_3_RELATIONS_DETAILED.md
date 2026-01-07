# Phase 3: Advanced Relations

**Duration:** 7 days + 2 days testing  
**Priority:** HIGH  
**Version:** 2.1.0-beta.3

---

## Overview

Phase 3 completes the BelongsToMany relationship implementation with all Laravel pivot query methods, sync enhancements, and lazy eager loading aggregates. This brings GuruORM's many-to-many relationships to 100% Laravel parity.

**Current State:**
- ✅ Basic BelongsToMany relationship works
- ✅ attach(), detach(), sync() implemented
- ✅ wherePivot() methods added in Phase 1
- ❌ Pivot column selection incomplete
- ❌ Advanced sync methods missing
- ❌ Lazy aggregate loading missing
- ❌ Touch parent timestamps incomplete

**Target State:**
- ✅ Complete pivot query methods
- ✅ All sync variants
- ✅ Full lazy eager loading support
- ✅ Touch relations working
- ✅ 100% Laravel BelongsToMany parity

---

## Detailed Implementation Plan

### Day 1: Verify Phase 1 & Pivot Selection (1 day)

#### Morning: Verify wherePivot Implementation

**Task:** Run tests from Phase 1 to ensure all wherePivot methods work correctly.

**Test Checklist:**
```typescript
// Run Phase 1 pivot tests
npm test -- BelongsToManyPivot.test.ts

// Verify these methods work:
// - wherePivot()
// - wherePivotIn(), wherePivotNotIn()
// - wherePivotNull(), wherePivotNotNull()
// - wherePivotBetween(), wherePivotNotBetween()
// - orderByPivot()
```

**Expected Results:**
- All wherePivot tests pass
- SQL generation correct for all databases
- Proper binding of parameters

**If Tests Fail:**
- Fix issues before proceeding
- Update Phase 1 implementation
- Re-run tests until all pass

---

#### Afternoon: Enhance withPivot() and Pivot Access

**Current Issue:**
The existing `withPivot()` method declaration exists but doesn't properly select and attach pivot data to results.

**File:** `/src/Eloquent/Relations/BelongsToMany.ts`

**Step 1.1: Add Pivot Column Tracking**

Add after class properties:

```typescript
/**
 * BelongsToMany Relation - inspired by Laravel and Illuminate
 */
export class BelongsToMany extends Relation {
  protected table: string;
  protected foreignPivotKey: string;
  protected relatedPivotKey: string;
  protected parentKey: string;
  protected relatedKey: string;
  
  // ADD THESE NEW PROPERTIES
  protected pivotColumns: string[] = [];
  protected pivotWheres: any[] = [];
  protected pivotValues: any[] = [];
  protected pivotCreatedAt: string | null = null;
  protected pivotUpdatedAt: string | null = null;
  protected withTimestampsValue: boolean = false;
```

**Step 1.2: Complete withPivot() Implementation**

Replace the existing incomplete withPivot() method:

```typescript
/**
 * Specify which pivot columns to retrieve
 * Inspired by Laravel's BelongsToMany::withPivot()
 * 
 * @example
 * ```typescript
 * user.roles().withPivot('created_at', 'assigned_by').get();
 * // Each role will have pivot.created_at and pivot.assigned_by
 * ```
 */
withPivot(...columns: string[]): this {
    // Add to pivot columns list
    this.pivotColumns = [...new Set([...this.pivotColumns, ...columns])];
    return this;
}

/**
 * Get all pivot columns that should be selected
 */
protected getPivotColumns(): string[] {
    const columns = [
        this.foreignPivotKey,
        this.relatedPivotKey,
        ...this.pivotColumns
    ];
    
    // Add timestamps if enabled
    if (this.withTimestampsValue) {
        if (this.pivotCreatedAt) {
            columns.push(this.pivotCreatedAt);
        }
        if (this.pivotUpdatedAt) {
            columns.push(this.pivotUpdatedAt);
        }
    }
    
    return [...new Set(columns)];
}
```

**Step 1.3: Enhance performJoin() to Select Pivot Columns**

Update the performJoin() method to include pivot columns in select:

```typescript
/**
 * Set the join clause for the relation query
 */
protected performJoin(): void {
    const baseTable = this.related.getTable();
    const key = `${baseTable}.${this.relatedKey}`;

    // Join the pivot table to the related model's table
    this.query.join(
        this.table,
        `${this.table}.${this.relatedPivotKey}`,
        '=',
        key
    );
    
    // Select the related model's columns
    this.query.select(`${baseTable}.*`);
    
    // Select pivot columns with aliases
    const pivotColumns = this.getPivotColumns();
    for (const column of pivotColumns) {
        this.query.addSelect(
            `${this.table}.${column} as pivot_${column}`
        );
    }
}
```

**Step 1.4: Attach Pivot Data to Models**

Update the match() method to attach pivot data:

```typescript
/**
 * Match the eagerly loaded results to their parents
 */
match(models: Model[], results: any, relation: string): Model[] {
    const dictionary: { [key: string]: any[] } = {};

    // Build dictionary of results keyed by foreign pivot key
    for (const result of results.items || results) {
        const key = result.getAttribute(`pivot_${this.foreignPivotKey}`);
        
        if (!dictionary[key]) {
            dictionary[key] = [];
        }
        
        // Extract and attach pivot data
        this.attachPivotDataToModel(result);
        
        dictionary[key].push(result);
    }

    // Match results to models
    for (const model of models) {
        const key = model.getAttribute(this.parentKey);
        if (dictionary[key]) {
            model['relations'][relation] = new Collection(...dictionary[key]);
        }
    }

    return models;
}

/**
 * Attach pivot data to a model instance
 */
protected attachPivotDataToModel(model: Model): void {
    const pivot: Record<string, any> = {};
    const attributes = model.getAttributes();
    
    // Extract pivot columns from model attributes
    for (const key in attributes) {
        if (key.startsWith('pivot_')) {
            const pivotKey = key.replace('pivot_', '');
            pivot[pivotKey] = attributes[key];
            
            // Remove from model attributes
            delete attributes[key];
        }
    }
    
    // Attach pivot object to model
    if (Object.keys(pivot).length > 0) {
        model['pivot'] = pivot;
        model.setAttribute('pivot', pivot);
    }
}
```

**Step 1.5: Update withTimestamps()**

```typescript
/**
 * Indicate that the pivot table has creation and update timestamps
 * Inspired by Laravel's BelongsToMany::withTimestamps()
 */
withTimestamps(
    createdAt: string = 'created_at',
    updatedAt: string = 'updated_at'
): this {
    this.withTimestampsValue = true;
    this.pivotCreatedAt = createdAt;
    this.pivotUpdatedAt = updatedAt;
    
    return this.withPivot(createdAt, updatedAt);
}
```

**Step 1.6: Write Tests**

**File:** `/tests/unit/Eloquent/Relations/BelongsToManyPivot.test.ts`

```typescript
describe('BelongsToMany Pivot Column Selection', () => {
    let user: User;
    let role1: Role;
    let role2: Role;

    beforeEach(async () => {
        user = await User.create({ name: 'John', email: 'john@test.com' });
        role1 = await Role.create({ name: 'Admin' });
        role2 = await Role.create({ name: 'Editor' });
        
        // Attach with pivot data
        await user.roles().attach(role1.id, {
            assigned_at: new Date('2026-01-01'),
            assigned_by: 'manager'
        });
        await user.roles().attach(role2.id, {
            assigned_at: new Date('2026-01-05'),
            assigned_by: 'admin'
        });
    });

    describe('withPivot()', () => {
        it('should select and attach pivot columns', async () => {
            const roles = await user.roles()
                .withPivot('assigned_at', 'assigned_by')
                .get();
            
            expect(roles.length).toBe(2);
            expect(roles[0].pivot).toBeDefined();
            expect(roles[0].pivot.assigned_by).toBeDefined();
            expect(roles[0].pivot.assigned_at).toBeDefined();
        });

        it('should work with wherePivot()', async () => {
            const roles = await user.roles()
                .withPivot('assigned_at', 'assigned_by')
                .wherePivot('assigned_by', 'admin')
                .get();
            
            expect(roles.length).toBe(1);
            expect(roles[0].pivot.assigned_by).toBe('admin');
        });

        it('should work with orderByPivot()', async () => {
            const roles = await user.roles()
                .withPivot('assigned_at')
                .orderByPivot('assigned_at', 'desc')
                .get();
            
            expect(roles.length).toBe(2);
            expect(new Date(roles[0].pivot.assigned_at))
                .toBeGreaterThan(new Date(roles[1].pivot.assigned_at));
        });
    });

    describe('withTimestamps()', () => {
        it('should include pivot timestamps', async () => {
            const roles = await user.roles()
                .withTimestamps()
                .get();
            
            expect(roles.length).toBe(2);
            expect(roles[0].pivot.created_at).toBeDefined();
            expect(roles[0].pivot.updated_at).toBeDefined();
        });

        it('should work with custom timestamp names', async () => {
            const roles = await user.roles()
                .withTimestamps('assigned_at', 'modified_at')
                .get();
            
            expect(roles[0].pivot.assigned_at).toBeDefined();
        });
    });
});
```

---

### Day 2-3: Advanced Sync Methods (2 days)

#### Day 2 Morning: syncWithoutDetaching()

**Laravel Behavior:**
```php
// Only attach new IDs, don't remove existing ones
$user->roles()->syncWithoutDetaching([1, 2, 3]);

// With pivot data
$user->roles()->syncWithoutDetaching([
    1 => ['assigned_by' => 'admin'],
    2 => ['assigned_by' => 'manager']
]);
```

**GuruORM Target:**
```typescript
// Only attach new IDs
await user.roles().syncWithoutDetaching([1, 2, 3]);

// With pivot data
await user.roles().syncWithoutDetaching({
    1: { assigned_by: 'admin' },
    2: { assigned_by: 'manager' }
});
```

**Implementation:**

**File:** `/src/Eloquent/Relations/BelongsToMany.ts`

```typescript
/**
 * Sync the intermediate tables without detaching
 * Inspired by Laravel's BelongsToMany::syncWithoutDetaching()
 * 
 * @example
 * ```typescript
 * // Simple sync without detaching
 * await user.roles().syncWithoutDetaching([1, 2, 3]);
 * 
 * // With pivot attributes
 * await user.roles().syncWithoutDetaching({
 *     1: { assigned_by: 'admin' },
 *     2: { assigned_by: 'manager' }
 * });
 * ```
 */
async syncWithoutDetaching(
    ids: any[] | Record<string, any>,
    touch: boolean = true
): Promise<{
    attached: any[];
    updated: any[];
}> {
    const changes = {
        attached: [] as any[],
        updated: [] as any[]
    };
    
    // Normalize input
    const idsArray = Array.isArray(ids) ? ids : Object.keys(ids);
    const pivotData = Array.isArray(ids) ? {} : ids;
    
    // Get current relationship IDs
    const currentIds = await this.getCurrentlyAttachedPivots();
    const currentIdValues = currentIds.map((row: any) => 
        row[this.relatedPivotKey]
    );
    
    // Process each ID
    for (const id of idsArray) {
        const attributes = pivotData[id] || {};
        
        if (!currentIdValues.includes(id)) {
            // New relationship - attach
            await this.attach(id, attributes, touch);
            changes.attached.push(id);
        } else if (Object.keys(attributes).length > 0) {
            // Existing relationship with new pivot data - update
            await this.updateExistingPivot(id, attributes, touch);
            changes.updated.push(id);
        }
    }
    
    return changes;
}

/**
 * Get the current relationship pivot rows
 */
protected async getCurrentlyAttachedPivots(): Promise<any[]> {
    return this.newPivotQuery()
        .where(this.foreignPivotKey, this.parent.getAttribute(this.parentKey))
        .get();
}

/**
 * Get a new pivot query instance
 */
protected newPivotQuery(): any {
    return this.query.getQuery().newQuery().from(this.table);
}
```

---

#### Day 2 Afternoon: updateExistingPivot()

**Laravel Behavior:**
```php
// Update pivot data for specific relationship
$user->roles()->updateExistingPivot($roleId, [
    'assigned_by' => 'new_admin',
    'expires_at' => now()->addYear()
]);
```

**Implementation:**

```typescript
/**
 * Update an existing pivot record on the table
 * Inspired by Laravel's BelongsToMany::updateExistingPivot()
 * 
 * @example
 * ```typescript
 * await user.roles().updateExistingPivot(roleId, {
 *     assigned_by: 'new_admin',
 *     expires_at: new Date('2027-01-01')
 * });
 * ```
 */
async updateExistingPivot(
    id: any,
    attributes: Record<string, any>,
    touch: boolean = true
): Promise<number> {
    // Add/update timestamps if enabled
    if (this.withTimestampsValue && this.pivotUpdatedAt) {
        attributes[this.pivotUpdatedAt] = new Date();
    }
    
    // Update pivot row
    const updated = await this.newPivotQuery()
        .where(this.foreignPivotKey, this.parent.getAttribute(this.parentKey))
        .where(this.relatedPivotKey, id)
        .update(attributes);
    
    // Touch parent timestamp
    if (touch) {
        await this.touchIfTouching();
    }
    
    return updated;
}

/**
 * Touch the parent model if we're set to touch on sync
 */
protected async touchIfTouching(): Promise<void> {
    if (this.touchingParent()) {
        await this.parent.touch();
    }
}

/**
 * Determine if we should touch the parent on sync
 */
protected touchingParent(): boolean {
    return this.parent.constructor['touches']?.includes(this.relationName) || false;
}
```

---

#### Day 3 Morning: syncWithPivotValues()

**Laravel Behavior:**
```php
// Apply same pivot values to all synced relationships
$user->roles()->syncWithPivotValues([1, 2, 3], [
    'assigned_by' => 'admin',
    'assigned_at' => now()
]);
```

**Implementation:**

```typescript
/**
 * Sync with pivot values for all synced IDs
 * Inspired by Laravel's BelongsToMany::syncWithPivotValues()
 * 
 * @example
 * ```typescript
 * await user.roles().syncWithPivotValues([1, 2, 3], {
 *     assigned_by: 'admin',
 *     assigned_at: new Date()
 * });
 * ```
 */
async syncWithPivotValues(
    ids: any[],
    values: Record<string, any>,
    detaching: boolean = true
): Promise<{
    attached: any[];
    detached: any[];
    updated: any[];
}> {
    // Convert to pivot data format
    const pivotData: Record<string, any> = {};
    
    for (const id of ids) {
        pivotData[id] = { ...values };
    }
    
    // Use regular sync with the same values for each ID
    return this.sync(pivotData, detaching);
}
```

---

#### Day 3 Afternoon: toggle()

**Laravel Behavior:**
```php
// Toggle relationships - attach if missing, detach if present
$user->roles()->toggle([1, 2, 3]);

// With pivot data for attached items
$user->roles()->toggle([
    1 => ['assigned_by' => 'admin']
]);
```

**Implementation:**

```typescript
/**
 * Toggle a model ID in the pivot table
 * Inspired by Laravel's BelongsToMany::toggle()
 * 
 * @example
 * ```typescript
 * // Simple toggle
 * await user.roles().toggle([1, 2, 3]);
 * 
 * // With pivot data for newly attached
 * await user.roles().toggle({
 *     1: { assigned_by: 'admin' }
 * });
 * ```
 */
async toggle(
    ids: any[] | Record<string, any>,
    touch: boolean = true
): Promise<{
    attached: any[];
    detached: any[];
}> {
    const changes = {
        attached: [] as any[],
        detached: [] as any[]
    };
    
    // Normalize input
    const idsArray = Array.isArray(ids) ? ids : Object.keys(ids);
    const pivotData = Array.isArray(ids) ? {} : ids;
    
    // Get current relationship IDs
    const currentIds = await this.getCurrentlyAttachedPivots();
    const currentIdValues = currentIds.map((row: any) => 
        row[this.relatedPivotKey]
    );
    
    // Process each ID
    for (const id of idsArray) {
        if (currentIdValues.includes(id)) {
            // Currently attached - detach it
            await this.detach([id], touch);
            changes.detached.push(id);
        } else {
            // Not attached - attach it
            const attributes = pivotData[id] || {};
            await this.attach(id, attributes, touch);
            changes.attached.push(id);
        }
    }
    
    return changes;
}
```

**Tests for Day 2-3:**

```typescript
describe('BelongsToMany Advanced Sync Methods', () => {
    let user: User;
    let roles: Role[];

    beforeEach(async () => {
        user = await User.create({ name: 'John', email: 'john@test.com' });
        roles = await Role.createMany([
            { name: 'Admin' },
            { name: 'Editor' },
            { name: 'Viewer' }
        ]);
        
        // Attach initial roles
        await user.roles().attach([roles[0].id, roles[1].id]);
    });

    describe('syncWithoutDetaching()', () => {
        it('should attach new IDs without detaching existing', async () => {
            const result = await user.roles().syncWithoutDetaching([roles[2].id]);
            
            expect(result.attached).toEqual([roles[2].id]);
            expect(result.updated).toEqual([]);
            
            const allRoles = await user.roles().get();
            expect(allRoles.length).toBe(3); // All 3 roles attached
        });

        it('should update pivot data for existing relationships', async () => {
            const result = await user.roles().syncWithoutDetaching({
                [roles[0].id]: { assigned_by: 'new_admin' },
                [roles[2].id]: { assigned_by: 'admin' }
            });
            
            expect(result.attached).toEqual([roles[2].id]);
            expect(result.updated).toEqual([roles[0].id]);
        });

        it('should not detach any existing relationships', async () => {
            await user.roles().syncWithoutDetaching([roles[2].id]);
            
            const allRoles = await user.roles().get();
            expect(allRoles.length).toBe(3);
            expect(allRoles.pluck('id')).toContain(roles[0].id);
            expect(allRoles.pluck('id')).toContain(roles[1].id);
            expect(allRoles.pluck('id')).toContain(roles[2].id);
        });
    });

    describe('updateExistingPivot()', () => {
        it('should update pivot data for existing relationship', async () => {
            const updated = await user.roles().updateExistingPivot(roles[0].id, {
                assigned_by: 'super_admin'
            });
            
            expect(updated).toBe(1);
            
            const role = await user.roles()
                .withPivot('assigned_by')
                .where('id', roles[0].id)
                .first();
            
            expect(role.pivot.assigned_by).toBe('super_admin');
        });

        it('should update timestamps if enabled', async () => {
            const result = await user.roles()
                .withTimestamps()
                .updateExistingPivot(roles[0].id, {
                    assigned_by: 'admin'
                });
            
            const role = await user.roles()
                .withTimestamps()
                .where('id', roles[0].id)
                .first();
            
            expect(role.pivot.updated_at).toBeDefined();
        });
    });

    describe('syncWithPivotValues()', () => {
        it('should sync with same pivot values for all IDs', async () => {
            const result = await user.roles().syncWithPivotValues(
                [roles[0].id, roles[2].id],
                { assigned_by: 'admin', level: 5 }
            );
            
            expect(result.attached).toContain(roles[2].id);
            expect(result.detached).toContain(roles[1].id);
            
            const allRoles = await user.roles()
                .withPivot('assigned_by', 'level')
                .get();
            
            expect(allRoles.length).toBe(2);
            allRoles.each(role => {
                expect(role.pivot.assigned_by).toBe('admin');
                expect(role.pivot.level).toBe(5);
            });
        });
    });

    describe('toggle()', () => {
        it('should detach existing and attach missing', async () => {
            // roles[0] and roles[1] are attached
            // Toggle roles[1] and roles[2]
            const result = await user.roles().toggle([roles[1].id, roles[2].id]);
            
            expect(result.detached).toContain(roles[1].id);
            expect(result.attached).toContain(roles[2].id);
            
            const allRoles = await user.roles().get();
            expect(allRoles.length).toBe(2);
            expect(allRoles.pluck('id')).toContain(roles[0].id);
            expect(allRoles.pluck('id')).toContain(roles[2].id);
        });

        it('should attach with pivot data for newly attached', async () => {
            const result = await user.roles().toggle({
                [roles[2].id]: { assigned_by: 'toggle_admin' }
            });
            
            expect(result.attached).toContain(roles[2].id);
            
            const role = await user.roles()
                .withPivot('assigned_by')
                .where('id', roles[2].id)
                .first();
            
            expect(role.pivot.assigned_by).toBe('toggle_admin');
        });
    });
});
```

---

### Day 4-5: Lazy Eager Loading Aggregates (2 days)

#### Day 4: loadCount() and Base Infrastructure

**Laravel Behavior:**
```php
$user = User::find(1);

// Lazy load relationship counts
$user->loadCount('posts', 'comments');
echo $user->posts_count; // 10
echo $user->comments_count; // 25

// With constraints
$user->loadCount([
    'posts' => function($query) {
        $query->where('published', true);
    }
]);
```

**GuruORM Target:**
```typescript
const user = await User.find(1);

// Lazy load relationship counts
await user.loadCount('posts', 'comments');
console.log(user.posts_count); // 10
console.log(user.comments_count); // 25

// With constraints
await user.loadCount({
    posts: (query) => query.where('published', true)
});
```

**Implementation:**

**File:** `/src/Eloquent/Model.ts`

```typescript
/**
 * Lazy load relationship counts
 * Inspired by Laravel's Model::loadCount()
 * 
 * @example
 * ```typescript
 * // Simple counts
 * await user.loadCount('posts', 'comments');
 * console.log(user.posts_count); // 10
 * 
 * // With constraints
 * await user.loadCount({
 *     posts: (query) => query.where('published', true)
 * });
 * console.log(user.posts_count); // 5
 * ```
 */
async loadCount(
    ...relations: (string | Record<string, Function>)[]
): Promise<this> {
    // Normalize relations
    const normalized = this.normalizeRelations(relations);
    
    // Load each count
    for (const [relation, constraints] of Object.entries(normalized)) {
        await this.loadAggregate(relation, constraints, 'count', '*');
    }
    
    return this;
}

/**
 * Normalize relation parameters to key-value pairs
 */
protected normalizeRelations(
    relations: (string | Record<string, Function>)[]
): Record<string, Function> {
    const normalized: Record<string, Function> = {};
    
    for (const relation of relations) {
        if (typeof relation === 'string') {
            normalized[relation] = (query: any) => query;
        } else {
            Object.assign(normalized, relation);
        }
    }
    
    return normalized;
}

/**
 * Load a single aggregate for a relationship
 */
protected async loadAggregate(
    relation: string,
    constraints: Function,
    aggregateFunction: string,
    column: string
): Promise<void> {
    // Get relation method
    const relationMethod = (this as any)[relation];
    
    if (!relationMethod) {
        throw new Error(`Relation ${relation} does not exist on ${this.constructor.name}`);
    }
    
    // Get relation instance
    const relationInstance = relationMethod.call(this);
    
    // Apply constraints
    constraints(relationInstance);
    
    // Get aggregate value
    const value = await relationInstance.getQuery()[aggregateFunction](column);
    
    // Set as attribute
    const attributeName = `${relation}_${aggregateFunction}${column !== '*' ? `_${column}` : ''}`;
    this.setAttribute(attributeName, value || 0);
}
```

**Tests for loadCount():**

```typescript
describe('Model Lazy Eager Loading Aggregates', () => {
    let user: User;
    let posts: Post[];

    beforeEach(async () => {
        user = await User.create({ name: 'John', email: 'john@test.com' });
        
        posts = await Post.createMany([
            { user_id: user.id, title: 'Post 1', published: true },
            { user_id: user.id, title: 'Post 2', published: true },
            { user_id: user.id, title: 'Post 3', published: false }
        ]);
        
        // Create comments for posts
        for (const post of posts) {
            await Comment.createMany([
                { post_id: post.id, content: 'Comment 1' },
                { post_id: post.id, content: 'Comment 2' }
            ]);
        }
    });

    describe('loadCount()', () => {
        it('should load single relationship count', async () => {
            await user.loadCount('posts');
            
            expect(user.posts_count).toBe(3);
        });

        it('should load multiple relationship counts', async () => {
            await user.loadCount('posts', 'comments');
            
            expect(user.posts_count).toBe(3);
            expect(user.comments_count).toBe(6);
        });

        it('should load count with constraints', async () => {
            await user.loadCount({
                posts: (query: any) => query.where('published', true)
            });
            
            expect(user.posts_count).toBe(2);
        });

        it('should set count to 0 if no related records', async () => {
            const newUser = await User.create({ 
                name: 'Jane', 
                email: 'jane@test.com' 
            });
            
            await newUser.loadCount('posts');
            
            expect(newUser.posts_count).toBe(0);
        });

        it('should work after model is loaded from database', async () => {
            const loadedUser = await User.find(user.id);
            await loadedUser!.loadCount('posts');
            
            expect(loadedUser!.posts_count).toBe(3);
        });
    });
});
```

---

#### Day 5: loadMax(), loadMin(), loadSum(), loadAvg()

**Laravel Behavior:**
```php
$user = User::find(1);

// Load max/min
$user->loadMax('orders', 'amount');
echo $user->orders_max_amount; // 999.99

$user->loadMin('orders', 'amount');
echo $user->orders_min_amount; // 10.00

// Load sum
$user->loadSum('orders', 'amount');
echo $user->orders_sum_amount; // 5432.10

// Load average
$user->loadAvg('orders', 'amount');
echo $user->orders_avg_amount; // 123.45
```

**Implementation:**

```typescript
/**
 * Lazy load relationship max aggregate
 * Inspired by Laravel's Model::loadMax()
 */
async loadMax(
    ...relations: (string | Record<string, string | [string, Function]>)[]
): Promise<this> {
    return this.loadMultipleAggregates(relations, 'max');
}

/**
 * Lazy load relationship min aggregate
 * Inspired by Laravel's Model::loadMin()
 */
async loadMin(
    ...relations: (string | Record<string, string | [string, Function]>)[]
): Promise<this> {
    return this.loadMultipleAggregates(relations, 'min');
}

/**
 * Lazy load relationship sum aggregate
 * Inspired by Laravel's Model::loadSum()
 */
async loadSum(
    ...relations: (string | Record<string, string | [string, Function]>)[]
): Promise<this> {
    return this.loadMultipleAggregates(relations, 'sum');
}

/**
 * Lazy load relationship average aggregate
 * Inspired by Laravel's Model::loadAvg()
 */
async loadAvg(
    ...relations: (string | Record<string, string | [string, Function]>)[]
): Promise<this> {
    return this.loadMultipleAggregates(relations, 'avg');
}

/**
 * Load multiple aggregates for relationships
 */
protected async loadMultipleAggregates(
    relations: (string | Record<string, string | [string, Function]>)[],
    aggregateFunction: string
): Promise<this> {
    // Normalize relations to { relation: [column, constraints] }
    const normalized = this.normalizeAggregateRelations(relations);
    
    // Load each aggregate
    for (const [relation, [column, constraints]] of Object.entries(normalized)) {
        await this.loadAggregate(relation, constraints, aggregateFunction, column);
    }
    
    return this;
}

/**
 * Normalize aggregate relation parameters
 */
protected normalizeAggregateRelations(
    relations: (string | Record<string, string | [string, Function]>)[]
): Record<string, [string, Function]> {
    const normalized: Record<string, [string, Function]> = {};
    
    for (const relation of relations) {
        if (typeof relation === 'string') {
            // Simple string - assume 'id' column
            normalized[relation] = ['id', (query: any) => query];
        } else {
            // Object with relation: column or relation: [column, constraints]
            for (const [rel, value] of Object.entries(relation)) {
                if (typeof value === 'string') {
                    normalized[rel] = [value, (query: any) => query];
                } else if (Array.isArray(value)) {
                    normalized[rel] = value;
                } else {
                    throw new Error('Invalid aggregate relation format');
                }
            }
        }
    }
    
    return normalized;
}
```

**Complete Tests for All Aggregates:**

```typescript
describe('Model Aggregate Methods', () => {
    let user: User;
    let orders: Order[];

    beforeEach(async () => {
        user = await User.create({ name: 'John', email: 'john@test.com' });
        
        orders = await Order.createMany([
            { user_id: user.id, amount: 100.00, status: 'completed' },
            { user_id: user.id, amount: 250.50, status: 'completed' },
            { user_id: user.id, amount: 50.00, status: 'pending' },
            { user_id: user.id, amount: 999.99, status: 'completed' }
        ]);
    });

    describe('loadMax()', () => {
        it('should load max value', async () => {
            await user.loadMax({ orders: 'amount' });
            
            expect(user.orders_max_amount).toBe(999.99);
        });

        it('should work with constraints', async () => {
            await user.loadMax({
                orders: ['amount', (query: any) => query.where('status', 'pending')]
            });
            
            expect(user.orders_max_amount).toBe(50.00);
        });
    });

    describe('loadMin()', () => {
        it('should load min value', async () => {
            await user.loadMin({ orders: 'amount' });
            
            expect(user.orders_min_amount).toBe(50.00);
        });
    });

    describe('loadSum()', () => {
        it('should load sum of values', async () => {
            await user.loadSum({ orders: 'amount' });
            
            expect(user.orders_sum_amount).toBe(1400.49);
        });

        it('should return 0 if no records', async () => {
            const newUser = await User.create({ 
                name: 'Jane', 
                email: 'jane@test.com' 
            });
            
            await newUser.loadSum({ orders: 'amount' });
            
            expect(newUser.orders_sum_amount).toBe(0);
        });
    });

    describe('loadAvg()', () => {
        it('should load average value', async () => {
            await user.loadAvg({ orders: 'amount' });
            
            const expected = 1400.49 / 4;
            expect(user.orders_avg_amount).toBeCloseTo(expected, 2);
        });

        it('should work with multiple relations', async () => {
            await user.loadAvg(
                { orders: 'amount' },
                { posts: 'views' }
            );
            
            expect(user.orders_avg_amount).toBeDefined();
            expect(user.posts_avg_views).toBeDefined();
        });
    });

    describe('combined aggregates', () => {
        it('should load multiple aggregates at once', async () => {
            await user.loadCount('orders');
            await user.loadSum({ orders: 'amount' });
            await user.loadAvg({ orders: 'amount' });
            await user.loadMax({ orders: 'amount' });
            await user.loadMin({ orders: 'amount' });
            
            expect(user.orders_count).toBe(4);
            expect(user.orders_sum_amount).toBe(1400.49);
            expect(user.orders_avg_amount).toBeCloseTo(350.12, 2);
            expect(user.orders_max_amount).toBe(999.99);
            expect(user.orders_min_amount).toBe(50.00);
        });
    });
});
```

---

### Day 6: Touch Parent Timestamps (1 day)

**Laravel Behavior:**
```php
class Comment extends Model
{
    protected $touches = ['post'];  // Touch parent when comment changes
    
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}

// When comment is saved/updated/deleted, post.updated_at is touched
$comment->save();  // Also updates $post->updated_at
```

**Implementation:**

**Step 6.1: Add Touches Property Support**

**File:** `/src/Eloquent/Model.ts`

```typescript
/**
 * Eloquent Model - inspired by Laravel and Illuminate
 */
export class Model {
    // ... existing properties ...
    
    /**
     * The relationships that should be touched on save
     */
    protected touches: string[] = [];
    
    /**
     * Indicates if the model should touch parent timestamps
     */
    static touching: boolean = true;
```

**Step 6.2: Touch Relations on Save**

Update the save() method:

```typescript
/**
 * Save the model to the database
 */
async save(options: { touch?: boolean } = {}): Promise<boolean> {
    const query = this.newQuery();
    
    // Fire saving event
    if (this.fireModelEvent('saving') === false) {
        return false;
    }
    
    // Determine if we should touch parent models
    const shouldTouch = options.touch !== false;
    
    let saved = false;
    
    if (this.exists) {
        saved = await this.performUpdate(query);
        
        if (saved) {
            this.fireModelEvent('updated', false);
        }
    } else {
        saved = await this.performInsert(query);
        
        if (saved) {
            this.exists = true;
            this.wasRecentlyCreated = true;
            this.fireModelEvent('created', false);
        }
    }
    
    if (saved) {
        this.finishSave(options);
        
        // Touch parent timestamps
        if (shouldTouch) {
            await this.touchOwners();
        }
    }
    
    return saved;
}
```

**Step 6.3: Implement touchOwners()**

```typescript
/**
 * Touch the owning relations of the model
 * Inspired by Laravel's Model::touchOwners()
 */
async touchOwners(): Promise<void> {
    if (!this.shouldTouchOwners()) {
        return;
    }
    
    for (const relation of this.getTouchedRelations()) {
        await this.touchRelation(relation);
    }
}

/**
 * Determine if the model should touch owners
 */
protected shouldTouchOwners(): boolean {
    return (this.constructor as typeof Model).touching && 
           this.getTouchedRelations().length > 0;
}

/**
 * Get the relationships that should be touched on save
 */
protected getTouchedRelations(): string[] {
    return this.touches || [];
}

/**
 * Touch a specific relation
 */
protected async touchRelation(relation: string): Promise<void> {
    const relationMethod = (this as any)[relation];
    
    if (!relationMethod) {
        return;
    }
    
    try {
        const relationInstance = relationMethod.call(this);
        
        // Only touch BelongsTo relations (parents)
        if (relationInstance.constructor.name === 'BelongsTo') {
            // If relation is loaded, touch it directly
            if (this.relationLoaded(relation)) {
                const related = this.getRelation(relation);
                
                if (related && related.exists) {
                    await related.touch();
                }
            } else {
                // Touch via database query (more efficient)
                await relationInstance.touch();
            }
        }
    } catch (error) {
        // Silently fail if relation can't be touched
        console.warn(`Failed to touch relation ${relation}:`, error);
    }
}
```

**Step 6.4: Add touch() Method to Relations**

**File:** `/src/Eloquent/Relations/BelongsTo.ts`

```typescript
/**
 * Touch all related models
 */
async touch(): Promise<void> {
    const related = await this.getResults();
    
    if (related && related.exists) {
        await related.touch();
    }
}
```

**Step 6.5: Add Global Touching Control**

```typescript
/**
 * Disable touching for all models
 */
static withoutTouching(callback: () => Promise<void>): Promise<void> {
    const original = Model.touching;
    Model.touching = false;
    
    try {
        return callback();
    } finally {
        Model.touching = original;
    }
}

/**
 * Disable touching for specific model types
 */
static withoutTouchingOn<T extends typeof Model>(
    models: T[],
    callback: () => Promise<void>
): Promise<void> {
    const original = new Map(models.map(m => [m, m.touching]));
    
    models.forEach(m => m.touching = false);
    
    try {
        return callback();
    } finally {
        original.forEach((value, model) => model.touching = value);
    }
}
```

**Tests for Touch Relations:**

```typescript
describe('Model Touch Relations', () => {
    let post: Post;
    let comment: Comment;

    beforeEach(async () => {
        post = await Post.create({
            title: 'Test Post',
            content: 'Content'
        });
        
        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));
        
        comment = await Comment.create({
            post_id: post.id,
            content: 'Test Comment'
        });
    });

    describe('touches property', () => {
        it('should touch parent when child is saved', async () => {
            // Set touches property
            Comment.prototype['touches'] = ['post'];
            
            const originalUpdatedAt = post.updated_at;
            
            // Wait to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Update comment
            comment.content = 'Updated Comment';
            await comment.save();
            
            // Reload post
            await post.refresh();
            
            expect(new Date(post.updated_at).getTime())
                .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
        });

        it('should touch multiple relations', async () => {
            // Create user
            const user = await User.create({ name: 'John', email: 'john@test.com' });
            comment.user_id = user.id;
            await comment.save();
            
            Comment.prototype['touches'] = ['post', 'user'];
            
            const originalPostUpdatedAt = post.updated_at;
            const originalUserUpdatedAt = user.updated_at;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            comment.content = 'Updated Again';
            await comment.save();
            
            await post.refresh();
            await user.refresh();
            
            expect(new Date(post.updated_at).getTime())
                .toBeGreaterThan(new Date(originalPostUpdatedAt).getTime());
            expect(new Date(user.updated_at).getTime())
                .toBeGreaterThan(new Date(originalUserUpdatedAt).getTime());
        });

        it('should not touch when save option is false', async () => {
            Comment.prototype['touches'] = ['post'];
            
            const originalUpdatedAt = post.updated_at;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            comment.content = 'Updated Comment';
            await comment.save({ touch: false });
            
            await post.refresh();
            
            expect(post.updated_at).toEqual(originalUpdatedAt);
        });
    });

    describe('withoutTouching()', () => {
        it('should disable touching globally', async () => {
            Comment.prototype['touches'] = ['post'];
            
            const originalUpdatedAt = post.updated_at;
            
            await Model.withoutTouching(async () => {
                comment.content = 'Updated';
                await comment.save();
            });
            
            await post.refresh();
            
            expect(post.updated_at).toEqual(originalUpdatedAt);
        });

        it('should re-enable touching after callback', async () => {
            Comment.prototype['touches'] = ['post'];
            
            await Model.withoutTouching(async () => {
                comment.content = 'Updated';
                await comment.save();
            });
            
            const originalUpdatedAt = post.updated_at;
            await new Promise(resolve => setTimeout(resolve, 100));
            
            comment.content = 'Updated Again';
            await comment.save();
            
            await post.refresh();
            
            expect(new Date(post.updated_at).getTime())
                .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
        });
    });

    describe('withoutTouchingOn()', () => {
        it('should disable touching for specific models', async () => {
            Comment.prototype['touches'] = ['post'];
            
            const originalUpdatedAt = post.updated_at;
            
            await Model.withoutTouchingOn([Comment], async () => {
                comment.content = 'Updated';
                await comment.save();
            });
            
            await post.refresh();
            
            expect(post.updated_at).toEqual(originalUpdatedAt);
        });
    });
});
```

---

### Day 7: Polymorphic Many-to-Many (1 day)

**Laravel Has:**
```php
// MorphToMany and MorphedByMany relationships
$post->tags(); // MorphToMany
$tag->posts(); // MorphedByMany
```

**Implementation:**

**File:** `/src/Eloquent/Relations/MorphToMany.ts`

Add all the same wherePivot methods, sync methods, and pivot features to MorphToMany:

```typescript
/**
 * MorphToMany Relation - inspired by Laravel and Illuminate
 * Polymorphic many-to-many relationship
 */
export class MorphToMany extends Relation {
    // ... existing code ...
    
    // Copy all wherePivot methods from BelongsToMany
    wherePivot(column: string, operator: any, value?: any): this {
        return this.where(`${this.table}.${column}`, operator, value);
    }
    
    // ... all other wherePivot methods ...
    
    // Copy all sync methods from BelongsToMany
    async syncWithoutDetaching(ids: any[] | Record<string, any>): Promise<any> {
        // Same implementation as BelongsToMany
    }
    
    async updateExistingPivot(id: any, attributes: Record<string, any>): Promise<number> {
        // Same implementation as BelongsToMany
    }
    
    async toggle(ids: any[] | Record<string, any>): Promise<any> {
        // Same implementation as BelongsToMany
    }
    
    // Pivot column selection
    withPivot(...columns: string[]): this {
        // Same as BelongsToMany
    }
    
    withTimestamps(createdAt?: string, updatedAt?: string): this {
        // Same as BelongsToMany
    }
}
```

---

## Testing Strategy (Day 8-9: 2 days)

### Day 8: Comprehensive Unit Tests

**Test Coverage Required:**
1. ✅ Pivot column selection (withPivot, withTimestamps)
2. ✅ All sync methods (syncWithoutDetaching, updateExistingPivot, toggle, syncWithPivotValues)
3. ✅ All lazy aggregate methods (loadCount, loadMax, loadMin, loadSum, loadAvg)
4. ✅ Touch parent timestamps
5. ✅ Polymorphic many-to-many enhancements

**Run Tests:**
```bash
cd /Users/rishi/Desktop/work/GuruORM

# Run all Phase 3 tests
npm test -- Phase3

# Run specific test suites
npm test -- BelongsToManyPivot
npm test -- BelongsToManySync
npm test -- ModelAggregates
npm test -- ModelTouch
npm test -- MorphToMany
```

---

### Day 9: Integration & Regression Tests

#### Integration Tests with Real Database

Test with PostgreSQL (primary database):

```typescript
describe('Phase 3 Integration Tests', () => {
    describe('Real-world many-to-many with pivot data', () => {
        it('should handle complete user-role workflow', async () => {
            // Create user
            const user = await User.create({
                name: 'John Doe',
                email: 'john@example.com'
            });
            
            // Create roles
            const adminRole = await Role.create({ name: 'admin' });
            const editorRole = await Role.create({ name: 'editor' });
            const viewerRole = await Role.create({ name: 'viewer' });
            
            // Attach with pivot data
            await user.roles().attach(adminRole.id, {
                assigned_by: 'system',
                assigned_at: new Date(),
                expires_at: new Date('2027-01-01')
            });
            
            await user.roles().attach(editorRole.id, {
                assigned_by: 'manager',
                assigned_at: new Date()
            });
            
            // Query with pivot
            let roles = await user.roles()
                .withPivot('assigned_by', 'assigned_at', 'expires_at')
                .wherePivot('assigned_by', 'system')
                .get();
            
            expect(roles.length).toBe(1);
            expect(roles[0].pivot.assigned_by).toBe('system');
            expect(roles[0].pivot.expires_at).toBeDefined();
            
            // Sync without detaching
            await user.roles().syncWithoutDetaching({
                [viewerRole.id]: { assigned_by: 'admin' }
            });
            
            roles = await user.roles().get();
            expect(roles.length).toBe(3);
            
            // Toggle
            await user.roles().toggle([editorRole.id, viewerRole.id]);
            
            roles = await user.roles().get();
            expect(roles.length).toBe(2); // admin and viewer
            
            // Update pivot
            await user.roles().updateExistingPivot(adminRole.id, {
                expires_at: new Date('2028-01-01')
            });
            
            roles = await user.roles()
                .withPivot('expires_at')
                .where('id', adminRole.id)
                .get();
            
            expect(new Date(roles[0].pivot.expires_at).getFullYear()).toBe(2028);
        });

        it('should handle lazy aggregates workflow', async () => {
            const user = await User.create({ name: 'Jane', email: 'jane@test.com' });
            
            // Create orders
            await Order.createMany([
                { user_id: user.id, amount: 100, status: 'completed' },
                { user_id: user.id, amount: 200, status: 'completed' },
                { user_id: user.id, amount: 50, status: 'pending' }
            ]);
            
            // Load multiple aggregates
            await user.loadCount('orders');
            await user.loadSum({ orders: 'amount' });
            await user.loadAvg({ orders: 'amount' });
            await user.loadMax({ orders: 'amount' });
            await user.loadMin({ orders: 'amount' });
            
            expect(user.orders_count).toBe(3);
            expect(user.orders_sum_amount).toBe(350);
            expect(user.orders_avg_amount).toBeCloseTo(116.67, 2);
            expect(user.orders_max_amount).toBe(200);
            expect(user.orders_min_amount).toBe(50);
            
            // With constraints
            await user.loadCount({
                orders: (query: any) => query.where('status', 'completed')
            });
            
            expect(user.orders_count).toBe(2);
        });
    });
});
```

#### Regression Tests Against Existing Projects

Test against neasto models:

```bash
cd /Users/rishi/Desktop/work/neasto

# Run tests with new GuruORM features
npm test

# Specific tests for relationships
npm test -- User.test
npm test -- Order.test
npm test -- Store.test
```

**Verify:**
- ✅ All existing relationship queries still work
- ✅ No performance degradation
- ✅ No breaking changes
- ✅ New features integrate smoothly

---

## Documentation Updates

### Update docs/relationships.md

Add sections for:

1. **Pivot Queries**
```markdown
### Querying Pivot Tables

#### wherePivot Methods
```typescript
await user.roles()
    .wherePivot('active', true)
    .wherePivotIn('status', [1, 2, 3])
    .wherePivotNull('deleted_at')
    .get();
```

#### Selecting Pivot Columns
```typescript
await user.roles()
    .withPivot('assigned_by', 'assigned_at')
    .withTimestamps()
    .get();

// Access pivot data
roles.forEach(role => {
    console.log(role.pivot.assigned_by);
    console.log(role.pivot.assigned_at);
});
```
```

2. **Syncing Methods**
3. **Lazy Aggregates**
4. **Touch Relations**

---

## Success Criteria Checklist

### Implementation
- [ ] Pivot column selection (withPivot, withTimestamps) complete
- [ ] Pivot data attached to models correctly
- [ ] syncWithoutDetaching() implemented and tested
- [ ] updateExistingPivot() implemented and tested
- [ ] toggle() implemented and tested
- [ ] syncWithPivotValues() implemented and tested
- [ ] loadCount() implemented and tested
- [ ] loadMax(), loadMin(), loadSum(), loadAvg() implemented and tested
- [ ] Touch parent timestamps working
- [ ] Polymorphic many-to-many enhanced

### Testing
- [ ] All unit tests pass (100% coverage for new code)
- [ ] All integration tests pass
- [ ] Regression tests pass (neasto, vasuzex-v2)
- [ ] Performance tests show no degradation
- [ ] Works across all database drivers

### Documentation
- [ ] All new methods documented with examples
- [ ] docs/relationships.md updated
- [ ] JSDoc comments complete
- [ ] CHANGELOG updated

### Quality
- [ ] No code duplication
- [ ] Follows existing GuruORM patterns
- [ ] TypeScript types complete
- [ ] Error handling robust
- [ ] Edge cases covered

---

## Timeline Summary

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | Verify Phase 1 & Pivot Selection | withPivot(), pivot data attachment |
| 2 | Sync Methods Part 1 | syncWithoutDetaching(), updateExistingPivot() |
| 3 | Sync Methods Part 2 | syncWithPivotValues(), toggle() |
| 4 | Lazy Aggregates Part 1 | loadCount(), base infrastructure |
| 5 | Lazy Aggregates Part 2 | loadMax(), loadMin(), loadSum(), loadAvg() |
| 6 | Touch Relations | touchOwners(), withoutTouching() |
| 7 | Polymorphic Enhancement | MorphToMany pivot methods |
| 8 | Unit Testing | Complete test coverage |
| 9 | Integration Testing | Real-world workflows, regression |

**Total:** 9 days  
**Phase 3 Completion:** February 5, 2026

---

## Next Steps

After Phase 3:
1. Publish `2.1.0-beta.3`
2. Update vasuzex-v2 and neasto
3. Gather feedback
4. Fix any issues
5. Proceed to Phase 4 (Query Builder & Schema)
