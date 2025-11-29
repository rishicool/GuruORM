import { Model } from '../Eloquent/Model';

/**
 * Model factory for generating test data
 */
export class Factory<T extends Model> {
  protected model: new () => T;
  protected count: number = 1;
  protected states: Record<string, any>[] = [];
  protected afterCreatingCallbacks: Array<(model: T) => void | Promise<void>> = [];
  protected afterMakingCallbacks: Array<(model: T) => void | Promise<void>> = [];

  constructor(modelClass: new () => T) {
    this.model = modelClass;
  }

  /**
   * Set the number of models to create
   */
  times(count: number): this {
    this.count = count;
    return this;
  }

  /**
   * Apply a state to the factory
   */
  state(state: Record<string, any>): this {
    this.states.push(state);
    return this;
  }

  /**
   * Create and save models
   */
  async create(attributes: Record<string, any> = {}): Promise<T | T[]> {
    const models = await this.make(attributes);
    
    if (Array.isArray(models)) {
      for (const model of models) {
        await model.save();
        await this.runAfterCreating(model);
      }
      return models;
    } else {
      await models.save();
      await this.runAfterCreating(models);
      return models;
    }
  }

  /**
   * Make models without saving
   */
  async make(attributes: Record<string, any> = {}): Promise<T | T[]> {
    const models: T[] = [];

    for (let i = 0; i < this.count; i++) {
      const model = new this.model();
      
      // Apply definition attributes
      const definition = this.definition();
      Object.assign(model, definition);

      // Apply states
      for (const state of this.states) {
        Object.assign(model, state);
      }

      // Apply provided attributes
      Object.assign(model, attributes);

      await this.runAfterMaking(model);
      models.push(model);
    }

    return this.count === 1 ? models[0] : models;
  }

  /**
   * Define the model's default attributes
   * Override this in subclasses
   */
  protected definition(): Record<string, any> {
    return {};
  }

  /**
   * Register a callback to run after creating
   */
  afterCreating(callback: (model: T) => void | Promise<void>): this {
    this.afterCreatingCallbacks.push(callback);
    return this;
  }

  /**
   * Register a callback to run after making
   */
  afterMaking(callback: (model: T) => void | Promise<void>): this {
    this.afterMakingCallbacks.push(callback);
    return this;
  }

  /**
   * Run after creating callbacks
   */
  protected async runAfterCreating(model: T): Promise<void> {
    for (const callback of this.afterCreatingCallbacks) {
      await callback(model);
    }
  }

  /**
   * Run after making callbacks
   */
  protected async runAfterMaking(model: T): Promise<void> {
    for (const callback of this.afterMakingCallbacks) {
      await callback(model);
    }
  }

  /**
   * Create a new factory instance
   */
  static for<T extends Model>(modelClass: new () => T): Factory<T> {
    return new Factory(modelClass);
  }
}

/**
 * Factory manager for registering and retrieving factories
 */
export class FactoryManager {
  private static factories: Map<string, any> = new Map();

  /**
   * Register a factory
   */
  static register<T extends Model>(
    modelClass: new () => T,
    factoryClass: new (modelClass: new () => T) => Factory<T>
  ): void {
    this.factories.set(modelClass.name, factoryClass);
  }

  /**
   * Get a factory for a model
   */
  static for<T extends Model>(modelClass: new () => T): Factory<T> {
    const factoryClass = this.factories.get(modelClass.name);
    
    if (factoryClass) {
      return new factoryClass(modelClass);
    }

    // Return default factory if no custom factory registered
    return new Factory(modelClass);
  }

  /**
   * Check if a factory exists for a model
   */
  static has(modelClass: new () => Model): boolean {
    return this.factories.has(modelClass.name);
  }

  /**
   * Clear all registered factories
   */
  static clear(): void {
    this.factories.clear();
  }
}

/**
 * Helper function to create a factory
 */
export function factory<T extends Model>(
  modelClass: new () => T,
  count?: number
): Factory<T> {
  const factory = FactoryManager.for(modelClass);
  if (count) {
    factory.times(count);
  }
  return factory;
}

/**
 * Define a model factory
 */
export function defineFactory<T extends Model>(
  modelClass: new () => T,
  definition: () => Record<string, any>
): void {
  class CustomFactory extends Factory<T> {
    protected definition(): Record<string, any> {
      return definition();
    }
  }

  FactoryManager.register(modelClass, CustomFactory);
}
