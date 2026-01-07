# Phase 5: Factory & Seeding Enhancements

**Duration:** 7 days + 2 days testing  
**Priority:** MEDIUM  
**Version:** 2.1.0-beta.5

---

## Overview

Phase 5 brings GuruORM's factory system to 100% Laravel parity with states, sequences, relationship factories, and advanced data generation patterns. This enables sophisticated test data generation and database seeding.

**Current State:**
- ✅ Basic Factory class with make/create
- ✅ Simple attribute definitions
- ✅ Basic count() and createMany()
- ❌ Factory states missing
- ❌ Sequences not implemented
- ❌ recycle() for relation reuse missing
- ❌ for() relationship factory missing
- ❌ has() and hasAttached() missing
- ❌ raw() and createOne() missing

**Target State:**
- ✅ Complete factory state management
- ✅ Sequence support with callbacks
- ✅ Full relationship factory methods
- ✅ Model recycling for efficient seeding
- ✅ 100% Laravel factory parity

---

## Detailed Implementation Plan

### Day 1: Factory States (1 day)

#### Morning: Implement state() Method

**Laravel Behavior:**
```php
class UserFactory extends Factory
{
    public function definition()
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'role' => 'user',
            'is_active' => true,
        ];
    }
    
    public function admin()
    {
        return $this->state(function (array $attributes) {
            return [
                'role' => 'admin',
            ];
        });
    }
    
    public function inactive()
    {
        return $this->state([
            'is_active' => false,
        ]);
    }
}

// Usage
User::factory()->admin()->create();
User::factory()->inactive()->count(5)->create();
```

**GuruORM Target:**
```typescript
class UserFactory extends Factory<User> {
    definition() {
        return {
            name: faker.name.fullName(),
            email: faker.internet.email(),
            role: 'user',
            is_active: true
        };
    }
    
    admin() {
        return this.state((attributes) => ({
            role: 'admin'
        }));
    }
    
    inactive() {
        return this.state({
            is_active: false
        });
    }
}

// Usage
await User.factory().admin().create();
await User.factory().inactive().count(5).create();
```

**Implementation:**

**File:** `/src/Seeding/Factory.ts`

**Step 1.1: Add State Management Properties**

```typescript
/**
 * Factory - inspired by Laravel and Illuminate
 */
export abstract class Factory<T extends Model = Model> {
    protected model: typeof Model;
    protected count: number = 1;
    protected faker: any;
    
    // ADD THESE NEW PROPERTIES
    protected states: StateDefinition[] = [];
    protected afterMaking: AfterCallback[] = [];
    protected afterCreating: AfterCallback[] = [];
    protected connection: string | null = null;
    protected recycledModels: Map<string, Model[]> = new Map();
    
    // ... existing code ...
}

// Type definitions
type StateDefinition = {
    attributes?: Record<string, any>;
    callback?: (attributes: Record<string, any>) => Record<string, any>;
};

type AfterCallback = (model: Model, attributes: Record<string, any>) => Promise<void> | void;
```

**Step 1.2: Implement state() Method**

```typescript
/**
 * Add a new state transformation to the factory
 * Inspired by Laravel's Factory::state()
 * 
 * @example
 * ```typescript
 * // State with callback
 * admin() {
 *     return this.state((attributes) => ({
 *         role: 'admin',
 *         permissions: this.getAdminPermissions()
 *     }));
 * }
 * 
 * // State with static attributes
 * inactive() {
 *     return this.state({
 *         is_active: false
 *     });
 * }
 * 
 * // Usage
 * await User.factory().admin().create();
 * ```
 */
state(
    state: Record<string, any> | ((attributes: Record<string, any>) => Record<string, any>)
): this {
    // Clone factory to maintain immutability
    const newFactory = this.newInstance();
    
    // Add state
    if (typeof state === 'function') {
        newFactory.states.push({ callback: state });
    } else {
        newFactory.states.push({ attributes: state });
    }
    
    return newFactory;
}

/**
 * Create a new instance of the factory
 */
protected newInstance(): this {
    const instance = new (this.constructor as any)();
    
    // Copy properties
    instance.count = this.count;
    instance.states = [...this.states];
    instance.afterMaking = [...this.afterMaking];
    instance.afterCreating = [...this.afterCreating];
    instance.connection = this.connection;
    instance.recycledModels = this.recycledModels;
    
    return instance;
}

/**
 * Apply all states to attributes
 */
protected applyStates(attributes: Record<string, any>): Record<string, any> {
    let result = { ...attributes };
    
    for (const state of this.states) {
        if (state.callback) {
            // Apply callback state
            const stateAttributes = state.callback(result);
            result = { ...result, ...stateAttributes };
        } else if (state.attributes) {
            // Apply static attributes
            result = { ...result, ...state.attributes };
        }
    }
    
    return result;
}
```

**Step 1.3: Update make() and create() to Use States**

```typescript
/**
 * Make a single model instance without saving
 */
async make(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    // Get base attributes from definition
    let attrs = this.definition();
    
    // Apply states
    attrs = this.applyStates(attrs);
    
    // Merge with provided attributes
    attrs = { ...attrs, ...attributes };
    
    // Create model instance
    const model = new this.model(attrs) as T;
    
    // Set connection if specified
    if (this.connection) {
        model.setConnection(this.connection);
    }
    
    // Run afterMaking callbacks
    for (const callback of this.afterMaking) {
        await callback(model, attrs);
    }
    
    return model;
}

/**
 * Create a single model instance and save to database
 */
async create(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    const model = await this.make(attributes);
    await model.save();
    
    // Run afterCreating callbacks
    for (const callback of this.afterCreating) {
        await callback(model, model.getAttributes());
    }
    
    return model;
}

/**
 * Make multiple model instances
 */
async makeMany(
    count: number,
    attributes: Partial<Record<string, any>> = {}
): Promise<T[]> {
    const models: T[] = [];
    
    for (let i = 0; i < count; i++) {
        models.push(await this.make(attributes));
    }
    
    return models;
}

/**
 * Create multiple model instances
 */
async createMany(
    count: number,
    attributes: Partial<Record<string, any>> = {}
): Promise<T[]> {
    const models: T[] = [];
    
    for (let i = 0; i < count; i++) {
        models.push(await this.create(attributes));
    }
    
    return models;
}
```

---

#### Afternoon: afterMaking() and afterCreating() Hooks

**Laravel Behavior:**
```php
User::factory()
    ->afterMaking(function ($user) {
        // Runs after make() but before saving
        $user->generateApiToken();
    })
    ->afterCreating(function ($user) {
        // Runs after create() and saving
        $user->sendWelcomeEmail();
    })
    ->create();
```

**Implementation:**

```typescript
/**
 * Add a callback to run after making a model
 * Inspired by Laravel's Factory::afterMaking()
 * 
 * @example
 * ```typescript
 * await User.factory()
 *     .afterMaking((user) => {
 *         user.api_token = generateToken();
 *     })
 *     .create();
 * ```
 */
afterMaking(
    callback: (model: T, attributes: Record<string, any>) => Promise<void> | void
): this {
    const newFactory = this.newInstance();
    newFactory.afterMaking.push(callback);
    return newFactory;
}

/**
 * Add a callback to run after creating a model
 * Inspired by Laravel's Factory::afterCreating()
 * 
 * @example
 * ```typescript
 * await User.factory()
 *     .afterCreating(async (user) => {
 *         await user.sendWelcomeEmail();
 *         await user.createDefaultSettings();
 *     })
 *     .create();
 * ```
 */
afterCreating(
    callback: (model: T, attributes: Record<string, any>) => Promise<void> | void
): this {
    const newFactory = this.newInstance();
    newFactory.afterCreating.push(callback);
    return newFactory;
}
```

**Tests for Day 1:**

```typescript
describe('Factory States', () => {
    describe('state() method', () => {
        it('should apply state with callback', async () => {
            class TestUserFactory extends Factory<User> {
                definition() {
                    return {
                        name: 'John Doe',
                        email: 'john@test.com',
                        role: 'user'
                    };
                }
                
                admin() {
                    return this.state((attributes) => ({
                        role: 'admin',
                        permissions: ['all']
                    }));
                }
            }
            
            User['factoryInstance'] = new TestUserFactory();
            
            const user = await User.factory().admin().create();
            
            expect(user.role).toBe('admin');
            expect(user.permissions).toEqual(['all']);
        });

        it('should apply state with static attributes', async () => {
            class TestUserFactory extends Factory<User> {
                definition() {
                    return {
                        name: 'John Doe',
                        email: 'john@test.com',
                        is_active: true
                    };
                }
                
                inactive() {
                    return this.state({
                        is_active: false
                    });
                }
            }
            
            User['factoryInstance'] = new TestUserFactory();
            
            const user = await User.factory().inactive().create();
            
            expect(user.is_active).toBe(false);
        });

        it('should chain multiple states', async () => {
            class TestUserFactory extends Factory<User> {
                definition() {
                    return {
                        name: 'John Doe',
                        email: 'john@test.com',
                        role: 'user',
                        is_active: true
                    };
                }
                
                admin() {
                    return this.state({ role: 'admin' });
                }
                
                inactive() {
                    return this.state({ is_active: false });
                }
            }
            
            User['factoryInstance'] = new TestUserFactory();
            
            const user = await User.factory()
                .admin()
                .inactive()
                .create();
            
            expect(user.role).toBe('admin');
            expect(user.is_active).toBe(false);
        });

        it('should work with count()', async () => {
            class TestUserFactory extends Factory<User> {
                definition() {
                    return {
                        name: faker.name.fullName(),
                        email: faker.internet.email(),
                        role: 'user'
                    };
                }
                
                admin() {
                    return this.state({ role: 'admin' });
                }
            }
            
            User['factoryInstance'] = new TestUserFactory();
            
            const users = await User.factory()
                .admin()
                .count(3)
                .create();
            
            expect(users.length).toBe(3);
            users.forEach(user => {
                expect(user.role).toBe('admin');
            });
        });
    });

    describe('afterMaking() and afterCreating()', () => {
        it('should run afterMaking callback', async () => {
            let callbackRan = false;
            
            const user = await User.factory()
                .afterMaking((user) => {
                    callbackRan = true;
                    user.api_token = 'test_token';
                })
                .create();
            
            expect(callbackRan).toBe(true);
            expect(user.api_token).toBe('test_token');
        });

        it('should run afterCreating callback', async () => {
            let callbackRan = false;
            
            const user = await User.factory()
                .afterCreating(async (user) => {
                    callbackRan = true;
                    expect(user.exists).toBe(true);
                })
                .create();
            
            expect(callbackRan).toBe(true);
        });

        it('should run multiple callbacks in order', async () => {
            const order: number[] = [];
            
            await User.factory()
                .afterMaking(() => order.push(1))
                .afterMaking(() => order.push(2))
                .afterCreating(() => order.push(3))
                .afterCreating(() => order.push(4))
                .create();
            
            expect(order).toEqual([1, 2, 3, 4]);
        });
    });
});
```

---

### Day 2-3: Sequences (2 days)

#### Day 2: Implement sequence() Method

**Laravel Behavior:**
```php
User::factory()
    ->count(10)
    ->sequence(
        ['role' => 'admin'],
        ['role' => 'user'],
        ['role' => 'moderator']
    )
    ->create();
// Creates users with rotating roles

Post::factory()
    ->count(10)
    ->sequence(fn ($sequence) => [
        'title' => 'Post ' . $sequence->index,
        'views' => $sequence->index * 100,
    ])
    ->create();
```

**Implementation:**

**File:** `/src/Seeding/Factory.ts`

**Step 2.1: Add Sequence Support**

```typescript
/**
 * Factory - inspired by Laravel and Illuminate
 */
export abstract class Factory<T extends Model = Model> {
    // ... existing properties ...
    
    // ADD SEQUENCE PROPERTIES
    protected sequences: SequenceDefinition[] = [];
    protected currentSequenceIndex: number = 0;
}

// Type definitions
type SequenceDefinition = {
    type: 'values' | 'callback';
    values?: Record<string, any>[];
    callback?: (sequence: SequenceState) => Record<string, any>;
};

type SequenceState = {
    index: number;
    count: number;
};
```

**Step 2.2: Implement sequence() Method**

```typescript
/**
 * Add a sequence to the factory
 * Inspired by Laravel's Factory::sequence()
 * 
 * @example
 * ```typescript
 * // Sequence with values
 * await User.factory()
 *     .count(10)
 *     .sequence(
 *         { role: 'admin' },
 *         { role: 'user' },
 *         { role: 'moderator' }
 *     )
 *     .create();
 * 
 * // Sequence with callback
 * await Post.factory()
 *     .count(10)
 *     .sequence((sequence) => ({
 *         title: `Post ${sequence.index}`,
 *         views: sequence.index * 100
 *     }))
 *     .create();
 * ```
 */
sequence(
    ...values: (Record<string, any> | ((sequence: SequenceState) => Record<string, any>))[]
): this {
    const newFactory = this.newInstance();
    
    // Check if single callback or multiple values
    if (values.length === 1 && typeof values[0] === 'function') {
        // Callback sequence
        newFactory.sequences.push({
            type: 'callback',
            callback: values[0] as (sequence: SequenceState) => Record<string, any>
        });
    } else {
        // Values sequence
        newFactory.sequences.push({
            type: 'values',
            values: values as Record<string, any>[]
        });
    }
    
    return newFactory;
}

/**
 * Get the next sequence value
 */
protected getSequenceValue(index: number, total: number): Record<string, any> {
    if (this.sequences.length === 0) {
        return {};
    }
    
    let result = {};
    
    for (const sequence of this.sequences) {
        if (sequence.type === 'callback' && sequence.callback) {
            // Callback sequence
            const value = sequence.callback({
                index: index,
                count: total
            });
            result = { ...result, ...value };
        } else if (sequence.type === 'values' && sequence.values) {
            // Rotating values sequence
            const valueIndex = index % sequence.values.length;
            result = { ...result, ...sequence.values[valueIndex] };
        }
    }
    
    return result;
}
```

**Step 2.3: Update make() and create() for Sequences**

```typescript
/**
 * Make multiple model instances
 */
async makeMany(
    count: number,
    attributes: Partial<Record<string, any>> = {}
): Promise<T[]> {
    const models: T[] = [];
    
    for (let i = 0; i < count; i++) {
        // Get sequence value for this iteration
        const sequenceAttrs = this.getSequenceValue(i, count);
        
        // Merge: definition -> states -> sequence -> provided
        const mergedAttrs = { ...sequenceAttrs, ...attributes };
        
        models.push(await this.make(mergedAttrs));
    }
    
    return models;
}

/**
 * Create multiple model instances
 */
async createMany(
    count: number,
    attributes: Partial<Record<string, any>> = {}
): Promise<T[]> {
    const models: T[] = [];
    
    for (let i = 0; i < count; i++) {
        const sequenceAttrs = this.getSequenceValue(i, count);
        const mergedAttrs = { ...sequenceAttrs, ...attributes };
        
        models.push(await this.create(mergedAttrs));
    }
    
    return models;
}
```

---

#### Day 3: Advanced Sequence Patterns

**Laravel Has:**
```php
// Nested sequences
User::factory()
    ->count(6)
    ->sequence(
        ['role' => 'admin', 'active' => true],
        ['role' => 'user', 'active' => false]
    )
    ->create();

// Sequence with state
User::factory()
    ->count(10)
    ->state(new Sequence(
        ['status' => 'active'],
        ['status' => 'pending']
    ))
    ->create();
```

**Implementation:**

```typescript
/**
 * Create a state using a sequence
 * Inspired by Laravel's Sequence class
 * 
 * @example
 * ```typescript
 * class UserFactory extends Factory<User> {
 *     definition() {
 *         return {
 *             name: faker.name.fullName(),
 *             email: faker.internet.email()
 *         };
 *     }
 *     
 *     activeInactive() {
 *         return this.state(
 *             new Sequence(
 *                 { status: 'active' },
 *                 { status: 'inactive' }
 *             )
 *         );
 *     }
 * }
 * ```
 */
export class Sequence {
    private values: Record<string, any>[];
    private index: number = 0;
    
    constructor(...values: Record<string, any>[]) {
        this.values = values;
    }
    
    /**
     * Get the next value in the sequence
     */
    __invoke(): Record<string, any> {
        const value = this.values[this.index % this.values.length];
        this.index++;
        return value;
    }
}

// Update state() to support Sequence
state(
    state: Record<string, any> | 
          ((attributes: Record<string, any>) => Record<string, any>) |
          Sequence
): this {
    const newFactory = this.newInstance();
    
    if (state instanceof Sequence) {
        // Sequence state
        newFactory.states.push({ 
            callback: () => state.__invoke() 
        });
    } else if (typeof state === 'function') {
        newFactory.states.push({ callback: state });
    } else {
        newFactory.states.push({ attributes: state });
    }
    
    return newFactory;
}
```

**Tests for Day 2-3:**

```typescript
describe('Factory Sequences', () => {
    describe('sequence() with values', () => {
        it('should rotate through values', async () => {
            const users = await User.factory()
                .count(6)
                .sequence(
                    { role: 'admin' },
                    { role: 'user' },
                    { role: 'moderator' }
                )
                .create();
            
            expect(users[0].role).toBe('admin');
            expect(users[1].role).toBe('user');
            expect(users[2].role).toBe('moderator');
            expect(users[3].role).toBe('admin'); // Repeats
            expect(users[4].role).toBe('user');
            expect(users[5].role).toBe('moderator');
        });

        it('should work with multiple attributes', async () => {
            const users = await User.factory()
                .count(4)
                .sequence(
                    { role: 'admin', level: 10 },
                    { role: 'user', level: 1 }
                )
                .create();
            
            expect(users[0].role).toBe('admin');
            expect(users[0].level).toBe(10);
            expect(users[1].role).toBe('user');
            expect(users[1].level).toBe(1);
        });
    });

    describe('sequence() with callback', () => {
        it('should use index in callback', async () => {
            const posts = await Post.factory()
                .count(5)
                .sequence((sequence) => ({
                    title: `Post ${sequence.index}`,
                    views: sequence.index * 100
                }))
                .create();
            
            expect(posts[0].title).toBe('Post 0');
            expect(posts[0].views).toBe(0);
            expect(posts[1].title).toBe('Post 1');
            expect(posts[1].views).toBe(100);
            expect(posts[4].title).toBe('Post 4');
            expect(posts[4].views).toBe(400);
        });

        it('should have access to total count', async () => {
            const posts = await Post.factory()
                .count(10)
                .sequence((sequence) => ({
                    order: sequence.index + 1,
                    progress: ((sequence.index + 1) / sequence.count) * 100
                }))
                .create();
            
            expect(posts[0].order).toBe(1);
            expect(posts[0].progress).toBe(10);
            expect(posts[9].order).toBe(10);
            expect(posts[9].progress).toBe(100);
        });
    });

    describe('Sequence class', () => {
        it('should work as state', async () => {
            class TestUserFactory extends Factory<User> {
                definition() {
                    return {
                        name: faker.name.fullName(),
                        email: faker.internet.email()
                    };
                }
                
                activeInactive() {
                    return this.state(
                        new Sequence(
                            { status: 'active' },
                            { status: 'inactive' }
                        )
                    );
                }
            }
            
            User['factoryInstance'] = new TestUserFactory();
            
            const users = await User.factory()
                .activeInactive()
                .count(4)
                .create();
            
            expect(users[0].status).toBe('active');
            expect(users[1].status).toBe('inactive');
            expect(users[2].status).toBe('active');
            expect(users[3].status).toBe('inactive');
        });
    });

    describe('combined sequences and states', () => {
        it('should apply both sequence and state', async () => {
            class TestUserFactory extends Factory<User> {
                definition() {
                    return {
                        name: faker.name.fullName(),
                        email: faker.internet.email(),
                        role: 'user'
                    };
                }
                
                admin() {
                    return this.state({ role: 'admin' });
                }
            }
            
            User['factoryInstance'] = new TestUserFactory();
            
            const users = await User.factory()
                .admin()
                .count(3)
                .sequence(
                    { level: 1 },
                    { level: 2 },
                    { level: 3 }
                )
                .create();
            
            expect(users[0].role).toBe('admin');
            expect(users[0].level).toBe(1);
            expect(users[1].role).toBe('admin');
            expect(users[1].level).toBe(2);
        });
    });
});
```

---

### Day 4: Relationship Factories (1 day)

#### Morning: for() Method

**Laravel Behavior:**
```php
// Create post for a specific user
$user = User::factory()->create();
$post = Post::factory()->for($user)->create();

// Create multiple posts for user
$posts = Post::factory()
    ->for($user)
    ->count(3)
    ->create();

// With relationship name
$comment = Comment::factory()
    ->for(User::factory(), 'author')
    ->create();
```

**Implementation:**

```typescript
/**
 * Set the parent model for BelongsTo relationship
 * Inspired by Laravel's Factory::for()
 * 
 * @example
 * ```typescript
 * const user = await User.factory().create();
 * const post = await Post.factory().for(user).create();
 * 
 * // With custom relationship name
 * const comment = await Comment.factory()
 *     .for(await User.factory().create(), 'author')
 *     .create();
 * ```
 */
for(
    parent: Model | Factory<any>,
    relationship?: string
): this {
    const newFactory = this.newInstance();
    
    if (!newFactory.relationships) {
        newFactory.relationships = {};
    }
    
    // Determine relationship name
    const relName = relationship || this.guessRelationshipName(parent);
    
    newFactory.relationships[relName] = {
        type: 'for',
        factory: parent instanceof Model ? null : parent,
        model: parent instanceof Model ? parent : null
    };
    
    return newFactory;
}

/**
 * Guess relationship name from parent model
 */
protected guessRelationshipName(parent: Model | Factory<any>): string {
    const modelName = parent instanceof Model 
        ? parent.constructor.name
        : parent['model'].name;
    
    // Convert UserModel to user, PostModel to post
    return modelName.replace(/Model$/, '').toLowerCase();
}

/**
 * Apply parent relationships before creating
 */
protected async applyRelationships(attributes: Record<string, any>): Promise<Record<string, any>> {
    if (!this.relationships) {
        return attributes;
    }
    
    const result = { ...attributes };
    
    for (const [relationName, config] of Object.entries(this.relationships)) {
        if (config.type === 'for') {
            // Get parent model
            const parent = config.model || await config.factory!.create();
            
            // Get foreign key from model's relationship definition
            const relationMethod = (new this.model() as any)[relationName];
            
            if (relationMethod) {
                const relation = relationMethod.call(new this.model());
                
                if (relation.constructor.name === 'BelongsTo') {
                    // Set foreign key
                    const foreignKey = relation.getForeignKeyName();
                    result[foreignKey] = parent.getKey();
                }
            }
        }
    }
    
    return result;
}

// Update create() to apply relationships
async create(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    // Apply relationships first
    const attrs = await this.applyRelationships(attributes);
    
    const model = await this.make(attrs);
    await model.save();
    
    // Run afterCreating callbacks
    for (const callback of this.afterCreating) {
        await callback(model, model.getAttributes());
    }
    
    return model;
}
```

---

#### Afternoon: has() and hasAttached() Methods

**Laravel Behavior:**
```php
// Create user with posts
$user = User::factory()
    ->has(Post::factory()->count(3))
    ->create();

// With custom relationship name
$user = User::factory()
    ->has(Post::factory()->count(3), 'posts')
    ->create();

// Nested factories
$user = User::factory()
    ->has(
        Post::factory()
            ->count(3)
            ->has(Comment::factory()->count(5))
    )
    ->create();

// Many-to-many with hasAttached
$user = User::factory()
    ->hasAttached(
        Role::factory()->count(3),
        ['assigned_at' => now()]
    )
    ->create();
```

**Implementation:**

```typescript
/**
 * Add HasMany or HasOne relationship to factory
 * Inspired by Laravel's Factory::has()
 * 
 * @example
 * ```typescript
 * const user = await User.factory()
 *     .has(Post.factory().count(3))
 *     .create();
 * 
 * // With relationship name
 * const user = await User.factory()
 *     .has(Post.factory().count(3), 'posts')
 *     .create();
 * ```
 */
has(
    factory: Factory<any>,
    relationship?: string
): this {
    const newFactory = this.newInstance();
    
    if (!newFactory.relationships) {
        newFactory.relationships = {};
    }
    
    const relName = relationship || this.guessCollectionRelationName(factory);
    
    newFactory.relationships[relName] = {
        type: 'has',
        factory: factory
    };
    
    return newFactory;
}

/**
 * Add BelongsToMany relationship with pivot data
 * Inspired by Laravel's Factory::hasAttached()
 * 
 * @example
 * ```typescript
 * const user = await User.factory()
 *     .hasAttached(
 *         Role.factory().count(3),
 *         { assigned_at: new Date() }
 *     )
 *     .create();
 * ```
 */
hasAttached(
    factory: Factory<any>,
    pivotAttributes: Record<string, any> = {},
    relationship?: string
): this {
    const newFactory = this.newInstance();
    
    if (!newFactory.relationships) {
        newFactory.relationships = {};
    }
    
    const relName = relationship || this.guessCollectionRelationName(factory);
    
    newFactory.relationships[relName] = {
        type: 'hasAttached',
        factory: factory,
        pivotAttributes: pivotAttributes
    };
    
    return newFactory;
}

/**
 * Guess plural relationship name from factory
 */
protected guessCollectionRelationName(factory: Factory<any>): string {
    const modelName = factory['model'].name;
    const singular = modelName.replace(/Model$/, '').toLowerCase();
    
    // Simple pluralization
    if (singular.endsWith('y')) {
        return singular.slice(0, -1) + 'ies';
    } else if (singular.endsWith('s')) {
        return singular + 'es';
    } else {
        return singular + 's';
    }
}

/**
 * Create related models after main model is created
 */
protected async createRelatedModels(model: T): Promise<void> {
    if (!this.relationships) {
        return;
    }
    
    for (const [relationName, config] of Object.entries(this.relationships)) {
        if (config.type === 'has') {
            // HasMany or HasOne
            const relatedFactory = config.factory!.for(model, relationName);
            await relatedFactory.create();
        } else if (config.type === 'hasAttached') {
            // BelongsToMany
            const related = await config.factory!.create();
            const relationMethod = (model as any)[relationName];
            
            if (relationMethod) {
                const relation = relationMethod.call(model);
                await relation.attach(related.getKey(), config.pivotAttributes || {});
            }
        }
    }
}

// Update afterCreating to create related models
async create(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    const attrs = await this.applyRelationships(attributes);
    const model = await this.make(attrs);
    await model.save();
    
    // Create related models
    await this.createRelatedModels(model);
    
    // Run afterCreating callbacks
    for (const callback of this.afterCreating) {
        await callback(model, model.getAttributes());
    }
    
    return model;
}
```

**Tests:**

```typescript
describe('Factory Relationships', () => {
    describe('for() method', () => {
        it('should create model with parent', async () => {
            const user = await User.factory().create();
            const post = await Post.factory().for(user).create();
            
            expect(post.user_id).toBe(user.id);
        });

        it('should work with factory', async () => {
            const post = await Post.factory()
                .for(User.factory())
                .create();
            
            expect(post.user_id).toBeDefined();
            
            const user = await User.find(post.user_id);
            expect(user).toBeDefined();
        });

        it('should work with custom relationship name', async () => {
            const author = await User.factory().create();
            const comment = await Comment.factory()
                .for(author, 'author')
                .create();
            
            expect(comment.author_id).toBe(author.id);
        });
    });

    describe('has() method', () => {
        it('should create model with children', async () => {
            const user = await User.factory()
                .has(Post.factory().count(3))
                .create();
            
            const posts = await user.posts().get();
            expect(posts.length).toBe(3);
            posts.forEach((post: Post) => {
                expect(post.user_id).toBe(user.id);
            });
        });

        it('should work with nested factories', async () => {
            const user = await User.factory()
                .has(
                    Post.factory()
                        .count(2)
                        .has(Comment.factory().count(3))
                )
                .create();
            
            const posts = await user.posts().get();
            expect(posts.length).toBe(2);
            
            for (const post of posts) {
                const comments = await post.comments().get();
                expect(comments.length).toBe(3);
            }
        });
    });

    describe('hasAttached() method', () => {
        it('should create model with attached relationships', async () => {
            const user = await User.factory()
                .hasAttached(
                    Role.factory().count(3),
                    { assigned_at: new Date() }
                )
                .create();
            
            const roles = await user.roles().get();
            expect(roles.length).toBe(3);
            
            roles.forEach((role: Role) => {
                expect(role.pivot.assigned_at).toBeDefined();
            });
        });

        it('should work without pivot data', async () => {
            const user = await User.factory()
                .hasAttached(Role.factory().count(2))
                .create();
            
            const roles = await user.roles().get();
            expect(roles.length).toBe(2);
        });
    });
});
```

---

### Day 5: recycle() Method (1 day)

**Laravel Behavior:**
```php
// Reuse the same user for multiple posts (efficient seeding)
$users = User::factory()->count(5)->create();

$posts = Post::factory()
    ->count(50)
    ->recycle($users)
    ->create();
// Each post will belong to one of the 5 users (recycled)
```

**Implementation:**

```typescript
/**
 * Recycle models for relationship factories
 * Inspired by Laravel's Factory::recycle()
 * 
 * @example
 * ```typescript
 * const users = await User.factory().count(5).create();
 * 
 * const posts = await Post.factory()
 *     .count(50)
 *     .recycle(users)
 *     .create();
 * // Each post will belong to one of the 5 users
 * ```
 */
recycle(models: Model | Model[]): this {
    const newFactory = this.newInstance();
    
    const modelsArray = Array.isArray(models) ? models : [models];
    const modelType = modelsArray[0].constructor.name;
    
    // Store recycled models by type
    if (!newFactory.recycledModels) {
        newFactory.recycledModels = new Map();
    }
    
    newFactory.recycledModels.set(modelType, modelsArray);
    
    return newFactory;
}

/**
 * Get a recycled model for a relationship
 */
protected getRecycledModel(modelType: string): Model | null {
    if (!this.recycledModels || !this.recycledModels.has(modelType)) {
        return null;
    }
    
    const models = this.recycledModels.get(modelType)!;
    
    // Return random model from recycled pool
    return models[Math.floor(Math.random() * models.length)];
}

/**
 * Update applyRelationships to use recycled models
 */
protected async applyRelationships(attributes: Record<string, any>): Promise<Record<string, any>> {
    if (!this.relationships) {
        return attributes;
    }
    
    const result = { ...attributes };
    
    for (const [relationName, config] of Object.entries(this.relationships)) {
        if (config.type === 'for') {
            let parent: Model;
            
            // Check if we have recycled models for this type
            if (config.factory) {
                const modelType = config.factory['model'].name;
                const recycled = this.getRecycledModel(modelType);
                
                if (recycled) {
                    parent = recycled;
                } else {
                    parent = await config.factory.create();
                }
            } else {
                parent = config.model!;
            }
            
            // Set foreign key
            const relationMethod = (new this.model() as any)[relationName];
            
            if (relationMethod) {
                const relation = relationMethod.call(new this.model());
                
                if (relation.constructor.name === 'BelongsTo') {
                    const foreignKey = relation.getForeignKeyName();
                    result[foreignKey] = parent.getKey();
                }
            }
        }
    }
    
    return result;
}
```

**Tests:**

```typescript
describe('Factory recycle()', () => {
    it('should recycle models for relationships', async () => {
        const users = await User.factory().count(3).create();
        const userIds = users.map(u => u.id);
        
        const posts = await Post.factory()
            .count(20)
            .recycle(users)
            .create();
        
        expect(posts.length).toBe(20);
        
        // All posts should belong to one of the 3 users
        posts.forEach((post: Post) => {
            expect(userIds).toContain(post.user_id);
        });
        
        // Distribution should use all users (probabilistically)
        const distribution = new Set(posts.map(p => p.user_id));
        expect(distribution.size).toBeGreaterThan(1);
    });

    it('should work with single model', async () => {
        const user = await User.factory().create();
        
        const posts = await Post.factory()
            .count(5)
            .recycle(user)
            .create();
        
        posts.forEach((post: Post) => {
            expect(post.user_id).toBe(user.id);
        });
    });

    it('should improve seeding performance', async () => {
        const users = await User.factory().count(10).create();
        
        const start = Date.now();
        
        // Create 100 posts with recycled users
        await Post.factory()
            .count(100)
            .recycle(users)
            .create();
        
        const duration = Date.now() - start;
        
        // Should be faster than creating 100 new users
        // (This is more of a benchmark than a test)
        console.log(`Created 100 posts in ${duration}ms`);
        expect(duration).toBeLessThan(5000);
    });
});
```

---

### Day 6: Additional Factory Methods (1 day)

#### raw(), createOne(), createQuietly()

**Implementation:**

```typescript
/**
 * Get raw attribute array without creating model
 * Inspired by Laravel's Factory::raw()
 * 
 * @example
 * ```typescript
 * const attributes = await User.factory().raw();
 * // { name: 'John', email: 'john@test.com', ... }
 * 
 * const data = await User.factory().admin().raw();
 * ```
 */
async raw(attributes: Partial<Record<string, any>> = {}): Promise<Record<string, any>> {
    // Get base attributes
    let attrs = this.definition();
    
    // Apply states
    attrs = this.applyStates(attrs);
    
    // Apply relationships
    attrs = await this.applyRelationships(attrs);
    
    // Merge with provided
    attrs = { ...attrs, ...attributes };
    
    return attrs;
}

/**
 * Create a single model (alias for create)
 * Inspired by Laravel's Factory::createOne()
 */
async createOne(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    return this.create(attributes);
}

/**
 * Create model without firing model events
 * Inspired by Laravel's Factory::createQuietly()
 * 
 * @example
 * ```typescript
 * const user = await User.factory().createQuietly();
 * // Created without firing 'creating', 'created' events
 * ```
 */
async createQuietly(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    // Temporarily disable events
    const originalDispatcher = Model.getEventDispatcher();
    Model.unsetEventDispatcher();
    
    try {
        const model = await this.create(attributes);
        return model;
    } finally {
        // Restore event dispatcher
        if (originalDispatcher) {
            Model.setEventDispatcher(originalDispatcher);
        }
    }
}

/**
 * Make model without firing model events
 */
async makeQuietly(attributes: Partial<Record<string, any>> = {}): Promise<T> {
    const originalDispatcher = Model.getEventDispatcher();
    Model.unsetEventDispatcher();
    
    try {
        const model = await this.make(attributes);
        return model;
    } finally {
        if (originalDispatcher) {
            Model.setEventDispatcher(originalDispatcher);
        }
    }
}
```

---

### Day 7: Factory Registration & Helper Methods (1 day)

**Model Factory Helper:**

```typescript
/**
 * Model - inspired by Laravel and Illuminate
 */
export abstract class Model {
    // ... existing code ...
    
    /**
     * Factory instance for this model
     */
    protected static factoryInstance: Factory<any> | null = null;
    
    /**
     * Get a new factory instance for the model
     * Inspired by Laravel's Model::factory()
     * 
     * @example
     * ```typescript
     * const user = await User.factory().create();
     * const users = await User.factory().count(10).create();
     * ```
     */
    static factory<T extends Model>(this: { new (): T }): Factory<T> {
        const factoryClass = this['factoryInstance'];
        
        if (!factoryClass) {
            throw new Error(`No factory defined for ${this.name}`);
        }
        
        return factoryClass.newInstance();
    }
}
```

**Factory Discovery:**

```typescript
/**
 * Auto-discover and register factories
 */
export class FactoryBuilder {
    private static factories: Map<string, typeof Factory> = new Map();
    
    /**
     * Register a factory for a model
     */
    static register(model: typeof Model, factory: typeof Factory): void {
        this.factories.set(model.name, factory);
        model['factoryInstance'] = new factory();
    }
    
    /**
     * Load factories from directory
     */
    static async loadFactories(directory: string): Promise<void> {
        const files = await fs.readdir(directory);
        
        for (const file of files) {
            if (file.endsWith('.ts') || file.endsWith('.js')) {
                const factoryModule = await import(path.join(directory, file));
                
                // Auto-register factories
                for (const exported of Object.values(factoryModule)) {
                    if (exported && typeof exported === 'function') {
                        const instance = new (exported as any)();
                        
                        if (instance instanceof Factory) {
                            const model = instance['model'];
                            this.register(model, exported as typeof Factory);
                        }
                    }
                }
            }
        }
    }
}
```

---

## Testing Strategy (Day 8-9)

### Day 8: Unit Tests

```bash
npm test -- FactoryStates
npm test -- FactorySequences
npm test -- FactoryRelationships
npm test -- FactoryRecycle
```

### Day 9: Integration Tests with neasto

Test factory usage in real seeders:

```typescript
// neasto/database/seeders/UserSeeder.ts
import { User, Role, Post } from '../models';

export class UserSeeder {
    async run() {
        // Create admins
        const admins = await User.factory()
            .admin()
            .count(3)
            .has(Post.factory().count(10))
            .create();
        
        // Create regular users with recycled roles
        const roles = await Role.factory().count(5).create();
        
        await User.factory()
            .count(50)
            .hasAttached(
                roles,
                { assigned_at: new Date() }
            )
            .create();
    }
}
```

---

## Documentation Updates

Update `docs/testing.md` with:
- Factory states examples
- Sequence patterns
- Relationship factories
- Best practices for test data

---

## Success Criteria

- [ ] state() method complete with callbacks
- [ ] afterMaking() and afterCreating() hooks
- [ ] sequence() with values and callbacks
- [ ] Sequence class for state sequences
- [ ] for(), has(), hasAttached() relationship methods
- [ ] recycle() for model reuse
- [ ] raw(), createOne(), createQuietly()
- [ ] Factory registration system
- [ ] All tests pass
- [ ] neasto seeders work with new features

---

## Timeline Summary

| Day | Task |
|-----|------|
| 1 | State management + hooks |
| 2 | Sequences with values |
| 3 | Sequence callbacks + Sequence class |
| 4 | Relationship factories (for, has, hasAttached) |
| 5 | recycle() method |
| 6 | Additional methods (raw, createOne, createQuietly) |
| 7 | Factory registration |
| 8-9 | Testing |

**Phase 5 Completion:** February 23, 2026
