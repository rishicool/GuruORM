import { Builder as QueryBuilder } from '../Query/Builder';
import { Connection } from '../Connection/Connection';
import { Builder as EloquentBuilder } from './Builder';
import { Events } from './Events';

/**
 * Model base class - inspired by Laravel and Illuminate
 */
export class Model {
  // Model registry for morphTo relationships
  protected static morphMap: Record<string, typeof Model> = {};
  
  // Global model registry for string-based relations
  protected static modelRegistry: Record<string, typeof Model> = {};
  
  // Table configuration
  protected table?: string;
  protected primaryKey = 'id';
  protected keyType = 'number';
  protected incrementing = true;
  protected timestamps = true;
  protected dateFormat?: string;
  protected connection?: string;

  // Mass assignment (static versions for subclasses to override)
  protected static fillable?: string[];
  protected static guarded?: string[];
  protected static hidden?: string[];
  protected static visible?: string[];
  protected static appends?: string[];
  protected static casts?: Record<string, string>;

  // Mass assignment (instance properties as defaults)
  protected fillable: string[] = [];
  protected guarded: string[] = ['*'];

  // Serialization
  protected hidden: string[] = [];
  protected visible: string[] = [];
  protected appends: string[] = [];
  
  // Attribute casting
  protected casts: Record<string, string> = {};
  
  // Event customization
  protected dispatchesEvents: Record<string, string> = {};
  
  // Touch parent relations on save
  protected touches: string[] = [];
  
  // Model state
  protected attributes: Record<string, any> = {};
  protected original: Record<string, any> = {};
  protected relations: Record<string, any> = {};
  protected changes: Record<string, any> = {}; // Track changes from last save
  protected exists = false;
  protected wasRecentlyCreated = false;
  
  // Temporary flags
  protected static withoutTimestampsOn = false;
  protected static withoutEventsOn = false;

  /**
   * Check if the model exists in the database
   */
  modelExists(): boolean {
    return this.exists;
  }

  // Timestamps
  static CREATED_AT = 'created_at';
  static UPDATED_AT = 'updated_at';

  // Connection resolver
  protected static resolver: any = null;
  
  // Event dispatcher
  protected static dispatcher: any = null;

  // Global scopes
  protected static globalScopes: Map<string, any> = new Map();

  // Booted models
  protected static booted: Map<any, boolean> = new Map();

  constructor(attributes: Record<string, any> = {}) {
    this.syncOriginal();
    this.fill(attributes);
    this.bootIfNotBooted();
    
    // Store the actual constructor before Proxy wraps it
    const actualConstructor = this.constructor;
    
    // Return a Proxy to intercept property access for attributes
    return new Proxy(this, {
      get(target: any, prop: string | symbol, receiver: any) {
        // If it's a symbol, return it directly
        if (typeof prop === 'symbol') {
          return target[prop];
        }
        
        // Return actual constructor, not Proxy's constructor
        if (prop === 'constructor') {
          return actualConstructor;
        }
        
        // List of known Model class properties
        const modelProperties = [
          'table', 'primaryKey', 'keyType', 'incrementing', 'timestamps', 'dateFormat', 'connection',
          'fillable', 'guarded', 'hidden', 'visible', 'appends', 'casts', 'dispatchesEvents',
          'attributes', 'original', 'relations', 'exists', 'wasRecentlyCreated', 'touches', 'changes',
          'forceDeleting' // SoftDeletes internal property
        ];
        
        // If it's a model property, return it directly
        if (modelProperties.includes(prop as string)) {
          return Reflect.get(target, prop, receiver);
        }
        
        // Try getAttribute first (it checks LOADED relations, then attributes)
        // Use Reflect to avoid Proxy recursion
        const getAttribute = Reflect.get(target, 'getAttribute', receiver);
        const value = getAttribute.call(target, prop);
        
        // If getAttribute returned something (attribute or loaded relation), use it
        if (value !== undefined) {
          return value;
        }
        
        // Otherwise, return the property (methods, etc.)
        return Reflect.get(target, prop, receiver);
      },
      
      set(target: any, prop: string | symbol, value: any) {
        // If it's a symbol, set it directly
        if (typeof prop === 'symbol') {
          target[prop] = value;
          return true;
        }
        
        // List of known Model class properties
        const modelProperties = [
          'table', 'primaryKey', 'keyType', 'incrementing', 'timestamps', 'dateFormat', 'connection',
          'fillable', 'guarded', 'hidden', 'visible', 'appends', 'casts', 'dispatchesEvents',
          'attributes', 'original', 'relations', 'exists', 'wasRecentlyCreated', 'touches', 'changes',
          'forceDeleting' // SoftDeletes internal property
        ];
        
        // If it's a known model property or method, set it directly
        if (modelProperties.includes(prop as string) || typeof target[prop] === 'function') {
          target[prop] = value;
          return true;
        }
        
        // Otherwise, set it as an attribute
        target.setAttribute(prop, value);
        return true;
      }
    });
  }

  /**
   * Boot the model if it hasn't been booted
   */
  protected bootIfNotBooted(): void {
    const constructor = this.constructor as typeof Model;
    if (!Model.booted.get(constructor)) {
      Model.booted.set(constructor, true);
      this.boot();
    }
  }

  /**
   * Bootstrap the model
   */
  protected boot(): void {
    // Auto-register model for morphTo relationships using class name
    const constructor = this.constructor as typeof Model;
    Model.morphMap[constructor.name] = constructor;
    
    // Auto-register for string-based relations
    Model.modelRegistry[constructor.name] = constructor;
  }

  /**
   * Get a model class by its morph alias
   */
  static getMorphedModel(alias: string): typeof Model | undefined {
    return Model.morphMap[alias];
  }

  /**
   * Register a model class for string-based relations
   */
  static register(name: string, modelClass: typeof Model): void {
    Model.modelRegistry[name] = modelClass;
  }

  /**
   * Get a registered model class by name
   */
  static getModel(name: string): typeof Model | undefined {
    return Model.modelRegistry[name];
  }

  /**
   * Resolve model from string or class constructor
   */
  protected resolveModel(related: typeof Model | string): typeof Model {
    if (typeof related === 'string') {
      const modelClass = Model.getModel(related);
      if (!modelClass) {
        throw new Error(
          `Model "${related}" not found in registry. \n` +
          `Make sure the model has been imported and instantiated at least once, \n` +
          `or register it manually: Model.register('${related}', ${related})`
        );
      }
      return modelClass;
    }
    return related;
  }

  /**
   * Fill the model with an array of attributes
   */
  fill(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      if (this.isFillable(key)) {
        this.setAttribute(key, value);
      }
    }
    return this;
  }

  /**
   * Force fill the model with an array of attributes
   */
  forceFill(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value);
    }
    return this;
  }

  /**
   * Determine if the given attribute may be mass assigned
   */
  isFillable(key: string): boolean {
    // Get fillable and guarded from static properties (preferred) or instance properties (fallback)
    const fillable = (this.constructor as typeof Model).fillable ?? this.fillable;
    const guarded = (this.constructor as typeof Model).guarded ?? this.guarded;
    
    // If fillable is defined and not empty, check if key is in it
    if (fillable.length > 0) {
      return fillable.includes(key);
    }

    // Check if not guarded
    if (guarded.includes('*')) {
      return false;
    }

    return !guarded.includes(key);
  }

  /**
   * Get an attribute from the model
   */
  getAttribute(key: string): any {
    if (!key) {
      return;
    }

    // Check if accessor exists
    const accessor = this.getAccessor(key);
    if (accessor) {
      return accessor.call(this);
    }

    // Check if attribute exists
    if (this.attributes[key] !== undefined) {
      return this.castAttribute(key, this.attributes[key]);
    }

    // Check if relation exists
    if (this.relations[key] !== undefined) {
      return this.relations[key];
    }
  }

  /**
   * Get the value of an attribute before it was changed
   */
  getOriginal(key?: string): any {
    if (key === undefined) {
      return { ...this.original };
    }
    return this.original[key];
  }

  /**
   * Get a subset of the model's attributes
   */
  only(...attributes: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    const attrs = attributes.flat();
    
    for (const attr of attrs) {
      const value = this.getAttribute(attr);
      if (value !== undefined) {
        result[attr] = value;
      }
    }
    
    return result;
  }

  /**
   * Get all the model's attributes except the given ones
   */
  except(...attributes: string[]): Record<string, any> {
    const result = { ...this.attributes };
    const attrs = attributes.flat();
    
    for (const attr of attrs) {
      delete result[attr];
    }
    
    return result;
  }

  /**
   * Set an attribute on the model
   */
  setAttribute(key: string, value: any): this {
    // Check if mutator exists
    const mutator = this.getMutator(key);
    if (mutator) {
      mutator.call(this, value);
      return this;
    }

    // Cast the value if needed
    if (this.hasCast(key)) {
      value = this.castAttributeForSet(key, value);
    }

    this.attributes[key] = value;
    return this;
  }

  /**
   * Get an accessor for the attribute
   */
  protected getAccessor(key: string): Function | null {
    const method = `get${this.studly(key)}Attribute`;
    if (typeof (this as any)[method] === 'function') {
      return (this as any)[method];
    }
    return null;
  }

  /**
   * Get a mutator for the attribute
   */
  protected getMutator(key: string): Function | null {
    const method = `set${this.studly(key)}Attribute`;
    if (typeof (this as any)[method] === 'function') {
      return (this as any)[method];
    }
    return null;
  }

  /**
   * Convert string to studly case (PascalCase)
   */
  protected studly(value: string): string {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Determine whether an attribute should be cast
   */
  protected hasCast(key: string): boolean {
    const casts = (this.constructor as typeof Model).casts ?? this.casts;
    return casts[key] !== undefined;
  }

  /**
   * Cast an attribute to a native PHP type
   */
  protected castAttribute(key: string, value: any): any {
    if (value === null) {
      return value;
    }

    const casts = (this.constructor as typeof Model).casts ?? this.casts;
    const castType: any = casts[key];
    if (!castType) {
      return value;
    }

    // Check if it's a custom cast class
    if (typeof castType === 'object' && castType.get) {
      return castType.get(this, key, value, this.attributes);
    }

    // Check if it's a class constructor for custom cast
    if (typeof castType === 'function') {
      const caster = new castType();
      if (caster.get) {
        return caster.get(this, key, value, this.attributes);
      }
    }

    switch (castType) {
      case 'int':
      case 'integer':
        return parseInt(value, 10);
      case 'real':
      case 'float':
      case 'double':
        return parseFloat(value);
      case 'string':
        return String(value);
      case 'bool':
      case 'boolean':
        return Boolean(value);
      case 'object':
      case 'array':
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value;
      case 'collection':
        const { Collection } = require('./Collection');
        const arr = typeof value === 'string' ? JSON.parse(value) : value;
        return new Collection(...(Array.isArray(arr) ? arr : [arr]));
      case 'date':
      case 'datetime':
      case 'timestamp':
        return new Date(value);
      case 'encrypted':
        // Basic decryption placeholder
        try {
          return Buffer.from(value, 'base64').toString('utf8');
        } catch (e) {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Cast an attribute for setting
   */
  protected castAttributeForSet(key: string, value: any): any {
    const casts = (this.constructor as typeof Model).casts ?? this.casts;
    const castType: any = casts[key];
    
    if (!castType) {
      return value;
    }

    // Check if it's a custom cast class
    if (typeof castType === 'object' && castType.set) {
      return castType.set(this, key, value, this.attributes);
    }

    // Check if it's a class constructor for custom cast
    if (typeof castType === 'function') {
      const caster = new castType();
      if (caster.set) {
        return caster.set(this, key, value, this.attributes);
      }
    }

    switch (castType) {
      case 'int':
      case 'integer':
        return parseInt(value, 10);
      case 'real':
      case 'float':
      case 'double':
        return parseFloat(value);
      case 'string':
        return String(value);
      case 'bool':
      case 'boolean':
        return Boolean(value);
      case 'object':
      case 'array':
      case 'json':
      case 'collection':
        return typeof value === 'string' ? value : JSON.stringify(value);
      case 'date':
      case 'datetime':
      case 'timestamp':
        return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
      case 'encrypted':
        // Basic encryption placeholder
        return Buffer.from(String(value)).toString('base64');
      default:
        return value;
    }
  }

  /**
   * Sync the original attributes with the current
   */
  syncOriginal(): this {
    // Store changes before syncing
    this.changes = this.getDirty();
    this.original = { ...this.attributes };
    return this;
  }

  /**
   * Sync a single original attribute with the current
   */
  syncOriginalAttribute(attribute: string): this {
    this.original[attribute] = this.attributes[attribute];
    return this;
  }

  /**
   * Get the attributes that have been changed since last sync
   */
  getDirty(): Record<string, any> {
    const dirty: Record<string, any> = {};

    for (const [key, value] of Object.entries(this.attributes)) {
      if (!this.originalIsEquivalent(key, value)) {
        dirty[key] = value;
      }
    }

    return dirty;
  }

  /**
   * Determine if the new and old values are equivalent
   */
  protected originalIsEquivalent(key: string, current: any): boolean {
    const original = this.original[key];
    
    if (current === original) {
      return true;
    }

    if (current === null || original === null) {
      return false;
    }

    return JSON.stringify(current) === JSON.stringify(original);
  }

  /**
   * Determine if the model or given attribute(s) have been modified
   */
  isDirty(...attributes: string[]): boolean {
    const dirty = this.getDirty();

    if (attributes.length === 0) {
      return Object.keys(dirty).length > 0;
    }

    return attributes.some(attr => dirty[attr] !== undefined);
  }

  /**
   * Determine if the model or given attribute(s) have remained the same
   */
  isClean(...attributes: string[]): boolean {
    return !this.isDirty(...attributes);
  }

  /**
   * Determine if the model or given attribute(s) were changed when last saved
   */
  wasChanged(...attributes: string[]): boolean {
    if (attributes.length === 0) {
      return Object.keys(this.changes).length > 0;
    }

    return attributes.some(attr => this.changes[attr] !== undefined);
  }

  /**
   * Get the attributes that were changed when last saved
   */
  getChanges(): Record<string, any> {
    return { ...this.changes };
  }

  /**
   * Save the model to the database
   */
  async save(): Promise<boolean> {
    const query = this.newQuery();

    // Fire the saving event
    if (await this.fireModelEvent('saving') === false) {
      return false;
    }

    // If the model exists, update it
    if (this.exists) {
      const saved = await this.performUpdate(query);
      
      if (saved) {
        this.syncOriginal();
      }

      return saved;
    }

    // Otherwise insert a new record
    const saved = await this.performInsert(query);
    
    if (saved) {
      this.exists = true;
      this.wasRecentlyCreated = true;
      this.syncOriginal();
    }

    return saved;
  }

  /**
   * Update the model with the given attributes
   */
  async update(attributes: Record<string, any> = {}): Promise<boolean> {
    if (!this.exists) {
      return false;
    }

    this.fill(attributes);
    return await this.save();
  }

  /**
   * Save the model without firing any events
   */
  async saveQuietly(): Promise<boolean> {
    // Temporarily disable events
    const originalEvents = (this.constructor as any).events;
    (this.constructor as any).events = [];
    
    const result = await this.save();
    
    // Restore events
    (this.constructor as any).events = originalEvents;
    
    return result;
  }

  /**
   * Touch the model's timestamps
   */
  async touch(): Promise<boolean> {
    if (!this.timestamps) {
      return false;
    }

    this.updateTimestamps();
    
    return await this.save();
  }

  /**
   * Touch the owning relations of the model
   */
  async touchOwners(): Promise<void> {
    if (!this.touches || this.touches.length === 0) {
      return;
    }

    for (const relation of this.touches) {
      if (this.relations[relation]) {
        await this.relations[relation].touch();
      } else if (typeof (this as any)[relation] === 'function') {
        const result = await this.getRelationshipFromMethod(relation);
        if (result) {
          await result.touch();
        }
      }
    }
  }

  /**
   * Get the first record matching the attributes or instantiate it
   */
  static async firstOrNew(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<any> {
    const instance = await this.query().where(attributes).first();
    
    if (instance) {
      return instance;
    }

    return new this({ ...attributes, ...values });
  }

  /**
   * Get the first record matching the attributes or create it
   */
  static async firstOrCreate(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<any> {
    const instance = await this.query().where(attributes).first();
    
    if (instance) {
      return instance;
    }

    const model = new this({ ...attributes, ...values });
    await model.save();
    return model;
  }

  /**
   * Create or update a record matching the attributes, and fill it with values
   */
  static async updateOrCreate(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<any> {
    const instance = await this.query().where(attributes).first();
    
    if (instance) {
      await instance.fill(values).save();
      return instance;
    }

    const model = new this({ ...attributes, ...values });
    await model.save();
    return model;
  }

  /**
   * Execute a callback without timestamps being updated
   */
  static async withoutTimestamps<T>(callback: () => T | Promise<T>): Promise<T> {
    const previous = this.withoutTimestampsOn;
    this.withoutTimestampsOn = true;

    try {
      return await callback();
    } finally {
      this.withoutTimestampsOn = previous;
    }
  }

  /**
   * Check if timestamps are currently disabled
   */
  protected static isIgnoringTimestamps(): boolean {
    return this.withoutTimestampsOn;
  }

  /**
   * Update the model's timestamps
   */
  protected updateTimestamps(): void {
    const constructor = this.constructor as typeof Model;
    
    // Check if the static method exists (for ES5 compatibility)
    if (typeof constructor.isIgnoringTimestamps !== 'function') {
      // Fall back to checking if timestamps are disabled on this instance
      if (!this.timestamps) {
        return;
      }
    } else if (constructor.isIgnoringTimestamps()) {
      return;
    }

    const time = new Date();

    const updatedAtColumn = (this.constructor as typeof Model).UPDATED_AT || 'updated_at';
    if (updatedAtColumn) {
      this.setAttribute(updatedAtColumn, time);
    }

    const createdAtColumn = (this.constructor as typeof Model).CREATED_AT || 'created_at';
    if (!this.exists && createdAtColumn) {
      this.setAttribute(createdAtColumn, time);
    }
  }

  /**
   * Perform a model insert operation
   */
  protected async performInsert(query: EloquentBuilder): Promise<boolean> {
    // Fire the creating event
    if (await this.fireModelEvent('creating') === false) {
      return false;
    }

    if (this.timestamps) {
      this.updateTimestamps();
    }

    const attributes = this.attributes;

    if (this.incrementing) {
      const id = await query.insertGetId(attributes);
      this.setAttribute(this.primaryKey, id);
    } else {
      await query.insert(attributes);
    }

    this.exists = true;
    this.wasRecentlyCreated = true;

    // Sync original to reflect current state
    this.syncOriginal();

    // Fire the created event
    await this.fireModelEvent('created', false);

    // Fire the saved event
    await this.fireModelEvent('saved', false);

    // Touch owning relations
    await this.touchOwners();

    return true;
  }

  /**
   * Perform a model update operation
   */
  protected async performUpdate(query: EloquentBuilder): Promise<boolean> {
    const dirty = this.getDirty();

    if (Object.keys(dirty).length === 0) {
      return true;
    }

    // Fire the updating event
    if (await this.fireModelEvent('updating') === false) {
      return false;
    }

    if (this.timestamps) {
      this.updateTimestamps();
    }

    const updated = await query.where(this.primaryKey, this.getKey()).update(dirty);

    if (updated > 0) {
      // Sync original to reflect current state
      this.syncOriginal();

      // Fire the updated event
      await this.fireModelEvent('updated', false);

      // Fire the saved event
      await this.fireModelEvent('saved', false);

      // Touch owning relations
      await this.touchOwners();
    }

    return updated > 0;
  }

  /**
   * Get a fresh timestamp for the model
   */
  protected freshTimestamp(): Date {
    return new Date();
  }

  /**
   * Delete the model from the database
   */
  async delete(): Promise<boolean> {
    if (!this.exists) {
      return false;
    }

    // Fire the deleting event
    if (await this.fireModelEvent('deleting') === false) {
      return false;
    }

    return await this.performDeleteOnModel();
  }

  /**
   * Perform the actual delete query on this model instance
   * Can be overridden by traits like SoftDeletes
   */
  protected async performDeleteOnModel(): Promise<boolean> {
    const query = this.newQuery().where(this.primaryKey, this.getKey());
    await query.delete();

    this.exists = false;

    // Fire the deleted event
    await this.fireModelEvent('deleted', false);

    return true;
  }

  /**
   * Force delete the model (alias for delete when soft deletes not used)
   */
  async forceDelete(): Promise<boolean> {
    return this.delete();
  }

  /**
   * Get the value of the model's primary key
   */
  getKey(): any {
    return this.getAttribute(this.primaryKey);
  }

  /**
   * Get the primary key for the model
   */
  getKeyName(): string {
    return this.primaryKey;
  }

  /**
   * Get the table associated with the model
   */
  getTable(): string {
    // First check instance property
    if (this.table) {
      return this.table;
    }

    // Then check static property on the constructor
    const constructor = this.constructor as typeof Model;
    if ((constructor as any).table) {
      return (constructor as any).table;
    }

    // Finally fall back to pluralized class name
    const className = this.constructor.name;
    return this.snake(className) + 's';
  }

  /**
   * Convert string to snake_case
   */
  protected snake(value: string): string {
    return value
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * Get a new query builder for the model's table
   */
  newQuery(): EloquentBuilder {
    const builder = new EloquentBuilder(this.newBaseQueryBuilder());
    builder.setModel(this);

    // Wrap builder in Proxy to support dynamic scope methods
    const proxy: any = new Proxy(builder, {
      get(target: any, prop: string | symbol) {
        // Return existing property/method
        if (prop in target || typeof prop === 'symbol') {
          const value = target[prop];
          // If it's a method that returns 'this', wrap the return to preserve proxy
          if (typeof value === 'function') {
            return function(...args: any[]) {
              const result = value.apply(target, args);
              // If method returns the builder, return the proxy instead
              return result === target ? proxy : result;
            };
          }
          return value;
        }

        // Check if it's a scope method (e.g., active() -> scopeActive())
        const scopeMethod = `scope${String(prop).charAt(0).toUpperCase() + String(prop).slice(1)}`;
        const modelConstructor = target.getModel().constructor;
        
        if (typeof modelConstructor[scopeMethod] === 'function') {
          return function(...args: any[]) {
            modelConstructor[scopeMethod](target, ...args);
            return proxy;
          };
        }

        return target[prop];
      }
    });

    return proxy;
  }

  /**
   * Get a new query builder that doesn't have any global scopes
   */
  newQueryWithoutScopes(): EloquentBuilder {
    return this.newQuery();
  }

  /**
   * Get a new query builder instance
   */
  protected newBaseQueryBuilder(): QueryBuilder {
    const connection = this.getConnection();
    return connection.query();
  }

  /**
   * Get the database connection for the model
   */
  getConnection(): Connection {
    return this.resolveConnection(this.connection);
  }

  /**
   * Resolve a connection instance
   */
  protected resolveConnection(connection?: string): Connection {
    return Model.getConnectionResolver()?.connection(connection);
  }

  /**
   * Get the connection resolver instance
   */
  static getConnectionResolver(): any {
    return Model.resolver;
  }

  /**
   * Set the connection resolver instance
   */
  static setConnectionResolver(resolver: any): void {
    Model.resolver = resolver;
  }

  /**
   * Convert the model instance to an array
   */
  toArray(): Record<string, any> {
    const array: Record<string, any> = { ...this.attributesToArray() };

    // Add appended attributes
    for (const key of this.appends) {
      array[key] = this.getAttribute(key);
    }

    // Add relations
    for (const [key, value] of Object.entries(this.relations)) {
      if (value && typeof value.toArray === 'function') {
        array[key] = value.toArray();
      } else if (Array.isArray(value)) {
        array[key] = value.map(item => 
          item && typeof item.toArray === 'function' ? item.toArray() : item
        );
      } else {
        array[key] = value;
      }
    }

    return this.filterVisible(array);
  }

  /**
   * Convert the model's attributes to an array
   */
  attributesToArray(): Record<string, any> {
    const attributes: Record<string, any> = {};

    for (const [key, value] of Object.entries(this.attributes)) {
      attributes[key] = this.castAttribute(key, value);
    }

    return attributes;
  }

  /**
   * Filter visible attributes
   */
  protected filterVisible(array: Record<string, any>): Record<string, any> {
    if (this.visible.length > 0) {
      const visible: Record<string, any> = {};
      for (const key of this.visible) {
        if (array[key] !== undefined) {
          visible[key] = array[key];
        }
      }
      return visible;
    }

    const hidden = (this.constructor as typeof Model).hidden ?? this.hidden;
    if (hidden.length > 0) {
      const filtered: Record<string, any> = {};
      for (const [key, value] of Object.entries(array)) {
        if (!hidden.includes(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    }

    return array;
  }

  /**
   * Make the given attributes visible
   */
  makeVisible(attributes: string | string[]): this {
    const attrs = Array.isArray(attributes) ? attributes : [attributes];
    this.hidden = this.hidden.filter(attr => !attrs.includes(attr));
    
    if (this.visible.length === 0) {
      this.visible = attrs;
    } else {
      this.visible = [...new Set([...this.visible, ...attrs])];
    }

    return this;
  }

  /**
   * Make the given attributes hidden
   */
  makeHidden(attributes: string | string[]): this {
    const attrs = Array.isArray(attributes) ? attributes : [attributes];
    this.hidden = [...new Set([...this.hidden, ...attrs])];
    return this;
  }

  /**
   * Convert the model instance to a plain object for JSON serialization
   * This method is called by JSON.stringify() automatically
   */
  toJSON(): Record<string, any> {
    return this.toArray();
  }

  /**
   * Convert the model instance to a plain object (alias for toJSON)
   */
  toJson(): Record<string, any> {
    return this.toJSON();
  }

  /**
   * Determine if two models have the same ID and belong to the same table
   */
  is(model: Model | null): boolean {
    return model !== null &&
      this.getKey() === model.getKey() &&
      this.getTable() === model.getTable() &&
      this.getConnectionName() === model.getConnectionName();
  }

  /**
   * Determine if two models are not the same
   */
  isNot(model: Model | null): boolean {
    return !this.is(model);
  }

  /**
   * Get the database connection name
   */
  getConnectionName(): string | undefined {
    return this.connection;
  }

  /**
   * Set the connection associated with the model
   */
  setConnection(name: string): this {
    this.connection = name;
    return this;
  }

  /**
   * Create a new instance of the model
   */
  static async create<T extends Model>(this: new (attributes?: Record<string, any>) => T, attributes: Record<string, any> = {}): Promise<T> {
    const model = new this();
    model.fill(attributes);
    await model.save();
    return model;
  }

  /**
   * Find a model by its primary key
   */
  static async find<T extends Model>(this: new (attributes?: Record<string, any>) => T, id: any, columns: string[] = ['*']): Promise<T | null> {
    const model = new this();
    return await model.newQuery().find(id, columns);
  }

  /**
   * Find a model by its primary key or throw an exception
   */
  static async findOrFail<T extends Model>(this: new (attributes?: Record<string, any>) => T, id: any, columns: string[] = ['*']): Promise<T> {
    const model = new this();
    return await model.newQuery().findOrFail(id, columns);
  }

  /**
   * Get all of the models from the database
   */
  static all<T extends Model>(this: new (attributes?: Record<string, any>) => T, columns: string[] = ['*']): Promise<T[]> {
    const model = new this();
    return model.newQuery().get(columns);
  }

  /**
   * Chunk the results of the query
   */
  static async chunk<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    count: number,
    callback: any
  ): Promise<boolean> {
    const model = new this();
    return await model.newQuery().chunk(count, callback);
  }

  /**
   * Begin querying the model
   */
  static query<T extends Model>(this: new (attributes?: Record<string, any>) => T): EloquentBuilder {
    const model = new this();
    return model.newQuery();
  }

  /**
   * Begin querying the model with an eager load
   */
  static with<T extends Model>(this: new (attributes?: Record<string, any>) => T, relations: string | string[] | Record<string, Function>): EloquentBuilder {
    const model = new this();
    return model.newQuery().with(relations);
  }

  /**
   * Add a basic where clause to the query
   */
  static where<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string | Function | Record<string, any>,
    operator?: any,
    value?: any,
    boolean: 'and' | 'or' = 'and'
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().where(column, operator, value, boolean);
  }

  /**
   * Add an "or where" clause to the query
   */
  static orWhere<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string | Function | Record<string, any>,
    operator?: any,
    value?: any
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().orWhere(column, operator, value);
  }

  /**
   * Add a "where in" clause to the query
   */
  static whereIn<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string,
    values: any[]
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereIn(column, values);
  }

  /**
   * Add a "where not in" clause to the query
   */
  static whereNotIn<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string,
    values: any[]
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereNotIn(column, values);
  }

  /**
   * Add a "where null" clause to the query
   */
  static whereNull<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereNull(column);
  }

  /**
   * Add a "where not null" clause to the query
   */
  static whereNotNull<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereNotNull(column);
  }

  /**
   * Add a "where between" clause to the query
   */
  static whereBetween<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string,
    values: [any, any]
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereBetween(column, values);
  }

  /**
   * Add an "order by" clause to the query
   */
  static orderBy<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    column: string,
    direction: 'asc' | 'desc' = 'asc'
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().orderBy(column, direction);
  }

  /**
   * Set the "limit" value of the query
   */
  static limit<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    value: number
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().limit(value);
  }

  /**
   * Set the "offset" value of the query
   */
  static offset<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    value: number
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().offset(value);
  }

  /**
   * Set the columns to be selected
   */
  static select<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    ...columns: string[]
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().select(...columns);
  }

  /**
   * Add a join clause to the query
   */
  static join<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    table: string,
    first: string | Function,
    operator?: string,
    second?: string,
    type: string = 'inner',
    where: boolean = false
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().join(table, first, operator, second, type, where);
  }

  /**
   * Add a left join to the query
   */
  static leftJoin<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    table: string,
    first: string | Function,
    operator?: string,
    second?: string
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().leftJoin(table, first, operator, second);
  }

  /**
   * Add a right join to the query
   */
  static rightJoin<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    table: string,
    first: string | Function,
    operator?: string,
    second?: string
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().rightJoin(table, first, operator, second);
  }

  /**
   * Force the query to only return distinct results
   */
  static distinct<T extends Model>(
    this: new (attributes?: Record<string, any>) => T
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().distinct();
  }

  /**
   * Add a "group by" clause to the query
   */
  static groupBy<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    ...groups: string[]
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().groupBy(...groups);
  }

  /**
   * Add subselect queries to count the relations
   */
  static withCount<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    relations: string | string[] | Record<string, Function>
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().withCount(relations);
  }

  /**
   * Add a where clause based on a relationship's existence
   */
  static has<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    relation: string,
    operator: string = '>=',
    count: number = 1
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().has(relation, operator, count);
  }

  /**
   * Add a where clause that requires a relationship to NOT exist
   */
  static doesntHave<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    relation: string
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().doesntHave(relation);
  }

  /**
   * Add a where clause based on a relationship's existence with callback
   */
  static whereHas<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    relation: string,
    callback?: Function,
    operator: string = '>=',
    count: number = 1
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereHas(relation, callback, operator, count);
  }

  static whereDoesntHave<T extends Model>(
    this: new (attributes?: Record<string, any>) => T,
    relation: string,
    callback?: Function
  ): EloquentBuilder {
    const model = new this();
    return model.newQuery().whereDoesntHave(relation, callback);
  }

  /**
   * Get the first record matching the attributes
   */
  static first<T extends Model>(this: new (attributes?: Record<string, any>) => T, columns: string[] = ['*']): Promise<T | null> {
    const model = new this();
    return model.newQuery().first(columns);
  }

  /**
   * Execute a query for a single record by ID and delete it
   */
  static async destroy<T extends Model>(this: new (attributes?: Record<string, any>) => T, ids: any | any[]): Promise<number> {
    const model = new this();
    const idsArray = Array.isArray(ids) ? ids : [ids];
    return await model.newQuery().whereIn(model.getKeyName(), idsArray).delete();
  }

  /**
   * Retrieve the "count" result of the query
   */
  static count<T extends Model>(this: new (attributes?: Record<string, any>) => T, columns: string = '*'): Promise<number> {
    const model = new this();
    return model.newQuery().count(columns);
  }

  /**
   * Retrieve the minimum value of a given column
   */
  static min<T extends Model>(this: new (attributes?: Record<string, any>) => T, column: string): Promise<number> {
    const model = new this();
    return model.newQuery().min(column);
  }

  /**
   * Retrieve the maximum value of a given column
   */
  static max<T extends Model>(this: new (attributes?: Record<string, any>) => T, column: string): Promise<number> {
    const model = new this();
    return model.newQuery().max(column);
  }

  /**
   * Retrieve the sum of the values of a given column
   */
  static sum<T extends Model>(this: new (attributes?: Record<string, any>) => T, column: string): Promise<number> {
    const model = new this();
    return model.newQuery().sum(column);
  }

  /**
   * Retrieve the average of the values of a given column
   */
  static avg<T extends Model>(this: new (attributes?: Record<string, any>) => T, column: string): Promise<number> {
    const model = new this();
    return model.newQuery().avg(column);
  }

  /**
   * Create a new instance of the given model
   */
  newInstance(attributes: Record<string, any> = {}, exists = false): this {
    // Create base model instance using Object.create to copy properties
    const model = Object.create(Object.getPrototypeOf(this));
    
    // Store the actual constructor BEFORE wrapping in Proxy
    const actualConstructor = this.constructor;
    
    // Copy model properties as non-enumerable to keep Object.keys() clean
    const propertiesToCopy = [
      'table', 'primaryKey', 'keyType', 'incrementing', 'timestamps', 'dateFormat', 'connection',
      'fillable', 'guarded', 'hidden', 'visible', 'appends', 'casts', 'dispatchesEvents',
      'original', 'relations', 'changes', 'wasRecentlyCreated', 'touches'
    ];
    
    for (const prop of propertiesToCopy) {
      if (prop in this) {
        Object.defineProperty(model, prop, {
          value: this[prop as keyof this],
          writable: true,
          enumerable: false,
          configurable: true
        });
      }
    }
    
    // Set attributes and exists as non-enumerable
    Object.defineProperty(model, 'attributes', {
      value: attributes,
      writable: true,
      enumerable: false,
      configurable: true
    });
    
    Object.defineProperty(model, 'exists', {
      value: exists,
      writable: true,
      enumerable: false,
      configurable: true
    });
    
    model.syncOriginal();
    
    // Manually wrap in Proxy (same logic as constructor)
    return new Proxy(model, {
      get(target: any, prop: string | symbol, receiver: any) {
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }
        
        // Return actual constructor, not Proxy's constructor
        if (prop === 'constructor') {
          return actualConstructor;
        }
        
        const modelProperties = [
          'table', 'primaryKey', 'keyType', 'incrementing', 'timestamps', 'dateFormat', 'connection',
          'fillable', 'guarded', 'hidden', 'visible', 'appends', 'casts', 'dispatchesEvents',
          'attributes', 'original', 'relations', 'changes', 'exists', 'wasRecentlyCreated'
        ];
        
        if (modelProperties.includes(prop as string)) {
          return Reflect.get(target, prop, receiver);
        }
        
        // Try getAttribute (checks LOADED relations, then attributes)
        const getAttribute = Reflect.get(target, 'getAttribute', receiver);
        const value = getAttribute.call(target, prop);
        
        if (value !== undefined) {
          return value;
        }
        
        return Reflect.get(target, prop, receiver);
      },
      
      set(target: any, prop: string | symbol, value: any) {
        if (typeof prop === 'symbol') {
          target[prop] = value;
          return true;
        }
        
        const modelProperties = [
          'table', 'primaryKey', 'keyType', 'incrementing', 'timestamps', 'dateFormat', 'connection',
          'fillable', 'guarded', 'hidden', 'visible', 'appends', 'casts', 'dispatchesEvents',
          'attributes', 'original', 'relations', 'exists', 'wasRecentlyCreated'
        ];
        
        if (modelProperties.includes(prop as string) || typeof target[prop] === 'function') {
          target[prop] = value;
          return true;
        }
        
        target.setAttribute(prop, value);
        return true;
      },
      
      ownKeys(target: any) {
        // Return only attribute keys for Object.keys() to work correctly
        return Object.keys(target.attributes || {});
      },
      
      has(target: any, prop: string | symbol) {
        // Check if property exists in attributes
        if (typeof prop === 'string' && target.attributes && prop in target.attributes) {
          return true;
        }
        return Reflect.has(target, prop);
      },
      
      getOwnPropertyDescriptor(target: any, prop: string | symbol) {
        // For attributes, return a descriptor that makes them enumerable
        if (typeof prop === 'string' && target.attributes && prop in target.attributes) {
          return {
            enumerable: true,
            configurable: true,
            writable: true,
            value: target.attributes[prop]
          };
        }
        // For other properties, return undefined so they're not enumerable
        return undefined;
      }
    }) as this;
  }

  /**
   * Reload the current model instance from the database
   */
  async fresh(columns: string[] = ['*']): Promise<this | null> {
    if (!this.exists) {
      return null;
    }

    return await this.newQuery().find(this.getKey(), columns);
  }

  /**
   * Reload the model from the database
   */
  async refresh(): Promise<this> {
    if (!this.exists) {
      return this;
    }

    const fresh = await this.fresh();
    
    if (fresh) {
      this.attributes = fresh.attributes;
      this.syncOriginal();
    }

    return this;
  }

  /**
   * Clone the model into a new, non-existing instance
   */
  replicate(except: string[] = []): this {
    const attributes = { ...this.attributes };

    // Remove primary key and timestamps
    delete attributes[this.primaryKey];
    delete attributes[(this.constructor as typeof Model).CREATED_AT];
    delete attributes[(this.constructor as typeof Model).UPDATED_AT];

    // Remove specified attributes
    for (const key of except) {
      delete attributes[key];
    }

    const instance = this.newInstance(attributes, false);
    
    // Fire replicating event
    this.fireModelEvent('replicating');
    
    return instance;
  }

  /**
   * Define a one-to-one relationship
   */
  hasOne(related: typeof Model | string, foreignKey?: string, localKey?: string): any {
    const { HasOne } = require('./Relations/HasOne');
    const relatedClass = this.resolveModel(related);
    const instance = new relatedClass();
    
    foreignKey = foreignKey || this.getForeignKey();
    localKey = localKey || this.getKeyName();

    return new HasOne(instance.newQuery(), this, foreignKey, localKey);
  }

  /**
   * Define a one-to-many relationship
   */
  hasMany(related: typeof Model | string, foreignKey?: string, localKey?: string): any {
    const { HasMany } = require('./Relations/HasMany');
    const relatedClass = this.resolveModel(related);
    const instance = new relatedClass();
    
    foreignKey = foreignKey || this.getForeignKey();
    localKey = localKey || this.getKeyName();

    return new HasMany(instance.newQuery(), this, foreignKey, localKey);
  }

  /**
   * Define an inverse one-to-one or many relationship
   */
  belongsTo(related: typeof Model | string, foreignKey?: string, ownerKey?: string): any {
    const { BelongsTo } = require('./Relations/BelongsTo');
    const relatedClass = this.resolveModel(related);
    const instance = new relatedClass();
    
    foreignKey = foreignKey || this.snake(instance.constructor.name) + '_id';
    ownerKey = ownerKey || instance.getKeyName();

    return new BelongsTo(instance.newQuery(), this, foreignKey, ownerKey);
  }

  /**
   * Define a many-to-many relationship
   */
  belongsToMany(
    related: typeof Model | string,
    table?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    parentKey?: string,
    relatedKey?: string
  ): any {
    const { BelongsToMany } = require('./Relations/BelongsToMany');
    const relatedClass = this.resolveModel(related);
    const instance = new relatedClass();
    
    foreignPivotKey = foreignPivotKey || this.getForeignKey();
    relatedPivotKey = relatedPivotKey || instance.getForeignKey();
    table = table || this.joiningTable(relatedClass);
    parentKey = parentKey || this.getKeyName();
    relatedKey = relatedKey || instance.getKeyName();

    return new BelongsToMany(
      instance.newQuery(),
      this,
      table,
      foreignPivotKey,
      relatedPivotKey,
      parentKey,
      relatedKey
    );
  }

  /**
   * Get the foreign key name for the model
   */
  getForeignKey(): string {
    return this.snake(this.constructor.name) + '_id';
  }

  /**
   * Define a has-one-through relationship
   */
  hasOneThrough(
    related: typeof Model | string,
    through: typeof Model | string,
    firstKey?: string,
    secondKey?: string,
    localKey?: string,
    secondLocalKey?: string
  ): any {
    const { HasOneThrough } = require('./Relations/HasOneThrough');
    
    const relatedClass = this.resolveModel(related);
    const throughClass = this.resolveModel(through);
    
    firstKey = firstKey || this.getForeignKey();
    secondKey = secondKey || new throughClass().getForeignKey();
    localKey = localKey || this.primaryKey;
    secondLocalKey = secondLocalKey || new throughClass().primaryKey;

    const instance = new relatedClass();
    return new HasOneThrough(
      instance.newQuery(),
      this,
      throughClass,
      firstKey,
      secondKey,
      localKey,
      secondLocalKey
    );
  }

  /**
   * Define a has-many-through relationship
   */
  hasManyThrough(
    related: typeof Model | string,
    through: typeof Model | string,
    firstKey?: string,
    secondKey?: string,
    localKey?: string,
    secondLocalKey?: string
  ): any {
    const { HasManyThrough } = require('./Relations/HasManyThrough');
    
    const relatedClass = this.resolveModel(related);
    const throughClass = this.resolveModel(through);
    
    firstKey = firstKey || this.getForeignKey();
    secondKey = secondKey || new throughClass().getForeignKey();
    localKey = localKey || this.primaryKey;
    secondLocalKey = secondLocalKey || new throughClass().primaryKey;

    const instance = new relatedClass();
    return new HasManyThrough(
      instance.newQuery(),
      this,
      throughClass,
      firstKey,
      secondKey,
      localKey,
      secondLocalKey
    );
  }

  /**
   * Define a polymorphic one-to-one relationship
   */
  morphOne(
    related: typeof Model,
    name: string,
    type?: string,
    id?: string,
    localKey?: string
  ): any {
    const { MorphOne } = require('./Relations/MorphOne');
    
    const instance = new related();
    type = type || name + '_type';
    id = id || name + '_id';
    localKey = localKey || this.primaryKey;

    return new MorphOne(
      instance.newQuery(),
      this,
      type,
      id,
      localKey
    );
  }

  /**
   * Define a polymorphic one-to-many relationship
   */
  morphMany(
    related: typeof Model,
    name: string,
    type?: string,
    id?: string,
    localKey?: string
  ): any {
    const { MorphMany } = require('./Relations/MorphMany');
    
    const instance = new related();
    type = type || name + '_type';
    id = id || name + '_id';
    localKey = localKey || this.primaryKey;

    return new MorphMany(
      instance.newQuery(),
      this,
      type,
      id,
      localKey
    );
  }

  /**
   * Define a polymorphic inverse relationship
   */
  morphTo(name?: string, type?: string, id?: string): any {
    const { MorphTo } = require('./Relations/MorphTo');
    
    name = name || 'morphable';
    type = type || name + '_type';
    id = id || name + '_id';

    // Create a placeholder query - actual query built dynamically
    return new MorphTo(
      this.newQuery(),
      this,
      id,
      type,
      name
    );
  }

  /**
   * Get the joining table name for a many-to-many relation
   */
  protected joiningTable(related: typeof Model): string {
    const models = [
      this.snake(this.constructor.name),
      this.snake(related.name)
    ].sort();

    return models.join('_');
  }

  /**
   * Get a relationship value from a method
   */
  getRelationValue(key: string): any {
    // If the relation is already loaded, return it
    if (this.relations[key] !== undefined) {
      return this.relations[key];
    }

    // Otherwise, try to load it
    if (typeof (this as any)[key] === 'function') {
      return this.getRelationshipFromMethod(key);
    }
  }

  /**
   * Get a relationship from a method on the model
   */
  protected getRelationshipFromMethod(method: string): any {
    const relation = (this as any)[method]();
    
    if (relation && typeof relation.getResults === 'function') {
      return this.relations[method] = relation.getResults();
    }

    return null;
  }

  /**
   * Fire the given event for the model
   */
  protected async fireModelEvent(event: string, halt = true): Promise<boolean> {
    // Check if events are disabled
    if ((this.constructor as typeof Model).withoutEventsOn) {
      return true;
    }

    // Check for custom event mapping
    const customEvent = this.dispatchesEvents[event];
    if (customEvent) {
      event = customEvent;
    }

    const modelClass = this.constructor.name;
    
    // Call observers first
    const { ObserverRegistry } = require('./Observer');
    const observerResult = await ObserverRegistry.callObservers(modelClass, event, this);
    
    if (observerResult === false && halt) {
      return false;
    }

    // Then fire regular events
    return Events.fire(modelClass, event, this);
  }

  /**
   * Execute a callback without firing model events
   */
  static async withoutEvents<T>(callback: () => T | Promise<T>): Promise<T> {
    const previous = this.withoutEventsOn;
    this.withoutEventsOn = true;

    try {
      return await callback();
    } finally {
      this.withoutEventsOn = previous;
    }
  }

  /**
   * Execute the callback without firing model events
   * Alias for withoutEvents
   */
  static async withoutModelEvents<T>(callback: () => T | Promise<T>): Promise<T> {
    return this.withoutEvents(callback);
  }

  /**
   * Eager load relations on the model
   */
  async load(relations: string | string[] | Record<string, Function | undefined>): Promise<this> {
    // Handle different input formats
    let relationsToLoad: Record<string, Function | undefined> = {};
    
    if (typeof relations === 'string') {
      relationsToLoad[relations] = undefined;
    } else if (Array.isArray(relations)) {
      relations.forEach(rel => relationsToLoad[rel] = undefined);
    } else {
      relationsToLoad = relations as Record<string, Function | undefined>;
    }

    for (const [relation, constraints] of Object.entries(relationsToLoad)) {
      // Check if this is a nested relation (e.g., 'posts.comments')
      if (relation.includes('.')) {
        const segments = relation.split('.');
        const firstRelation = segments[0];
        const nestedRelation = segments.slice(1).join('.');
        
        // Load the first level relation if not already loaded
        if (!this.relations[firstRelation]) {
          if (typeof (this as any)[firstRelation] === 'function') {
            const relationInstance = (this as any)[firstRelation]();
            
            if (relationInstance && typeof relationInstance.getResults === 'function') {
              // Apply constraints if provided for the first level
              if (constraints && typeof constraints === 'function') {
                constraints(relationInstance.getQuery());
              }
              this.relations[firstRelation] = await relationInstance.getResults();
            }
          }
        }
        
        // Load nested relations on the first level relation
        const firstLevelRelation = this.relations[firstRelation];
        if (firstLevelRelation) {
          if (Array.isArray(firstLevelRelation)) {
            // If it's a collection, load nested relations for each item
            for (const relatedModel of firstLevelRelation) {
              if (relatedModel && typeof relatedModel.load === 'function') {
                await relatedModel.load(nestedRelation);
              }
            }
          } else if (typeof firstLevelRelation.load === 'function') {
            // If it's a single model, load the nested relation
            await firstLevelRelation.load(nestedRelation);
          }
        }
      } else {
        // Regular single-level relation
        if (typeof (this as any)[relation] === 'function') {
          const relationInstance = (this as any)[relation]();
          
          if (relationInstance && typeof relationInstance.getResults === 'function') {
            // Apply constraints if provided
            if (constraints && typeof constraints === 'function') {
              constraints(relationInstance.getQuery());
            }
            this.relations[relation] = await relationInstance.getResults();
          }
        }
      }
    }

    return this;
  }

  /**
   * Eager load relations on the model if they are not already eager loaded
   */
  async loadMissing(relations: string | string[] | Record<string, Function | undefined>): Promise<this> {
    // Handle different input formats
    let relationsToCheck: Record<string, Function | undefined> = {};
    
    if (typeof relations === 'string') {
      relationsToCheck[relations] = undefined;
    } else if (Array.isArray(relations)) {
      relations.forEach(rel => relationsToCheck[rel] = undefined);
    } else {
      relationsToCheck = relations as Record<string, Function | undefined>;
    }

    // Filter to only missing relations
    const missing: Record<string, Function | undefined> = {};
    for (const [relation, constraints] of Object.entries(relationsToCheck)) {
      if (!this.relations[relation]) {
        missing[relation] = constraints;
      }
    }

    if (Object.keys(missing).length > 0) {
      await this.load(missing);
    }

    return this;
  }

  /**
   * Determine if the given relation is loaded
   */
  relationLoaded(key: string): boolean {
    return this.relations[key] !== undefined;
  }

  /**
   * Get all loaded relations for the model
   */
  getRelations(): Record<string, any> {
    return this.relations;
  }

  /**
   * Set the specific relationship in the model
   */
  setRelation(relation: string, value: any): this {
    this.relations[relation] = value;
    return this;
  }

  /**
   * Unset a loaded relationship
   */
  unsetRelation(relation: string): this {
    delete this.relations[relation];
    return this;
  }

  /**
   * Register a creating model event listener
   */
  static creating(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'creating', handler);
  }

  /**
   * Register a created model event listener
   */
  static created(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'created', handler);
  }

  /**
   * Register an updating model event listener
   */
  static updating(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'updating', handler);
  }

  /**
   * Register an updated model event listener
   */
  static updated(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'updated', handler);
  }

  /**
   * Register a saving model event listener
   */
  static saving(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'saving', handler);
  }

  /**
   * Register a saved model event listener
   */
  static saved(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'saved', handler);
  }

  /**
   * Register a deleting model event listener
   */
  static deleting(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'deleting', handler);
  }

  /**
   * Register a deleted model event listener
   */
  static deleted(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'deleted', handler);
  }

  /**
   * Register a retrieved model event listener
   */
  static retrieved(handler: (model: any) => void | Promise<void> | boolean | Promise<boolean>): void {
    Events.listen(this.name, 'retrieved', handler);
  }

  /**
   * Register an observer with the model
   */
  static observe(observer: any): void {
    const { ObserverRegistry } = require('./Observer');
    ObserverRegistry.observe(this.name, observer);
  }

  /**
   * Clear all observers for the model
   */
  static clearObservers(): void {
    const { ObserverRegistry } = require('./Observer');
    ObserverRegistry.clearObservers(this.name);
  }
}
