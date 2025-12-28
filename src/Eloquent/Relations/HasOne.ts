import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * HasOne Relation - inspired by Laravel and Illuminate
 */
export class HasOne extends Relation {
  protected foreignKey: string;
  protected localKey: string;
  protected withDefaultValue: any = null;
  protected withDefaultCallback: Function | null = null;

  constructor(query: Builder, parent: Model, foreignKey: string, localKey: string) {
    super(query, parent);
    this.foreignKey = foreignKey;
    this.localKey = localKey;
    this.addConstraints();
  }

  /**
   * Set the base constraints on the relation query
   * Only applies constraints if this is NOT an eager load scenario
   */
  addConstraints(): void {
    if (this.parent.modelExists()) {
      this.query.where(this.foreignKey, '=', this.parent.getAttribute(this.localKey));
      
      // Automatically apply soft delete constraint if related model uses soft deletes
      const relatedModel = this.related;
      const relatedConstructor = relatedModel.constructor as any;
      const usesSoftDeletes = relatedConstructor.softDeletes === true || 
                              relatedConstructor.prototype?.softDeletes === true;
      
      if (usesSoftDeletes) {
        const deletedAtColumn = relatedConstructor.deletedAt || 
                                relatedConstructor.DELETED_AT || 
                                'deleted_at';
        this.query.whereNull(deletedAtColumn);
      }
    }
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    // Get keys from parent models
    const keys = models.map(model => model.getAttribute(this.localKey)).filter(k => k != null);
     
    // Only add whereIn if we have keys
    if (keys.length > 0) {
      this.query.whereIn(this.foreignKey, keys);
    }
    
    // Apply soft delete constraint for eager loading too
    const relatedConstructor = this.related.constructor as any;
    const usesSoftDeletes = relatedConstructor.softDeletes === true || 
                            relatedConstructor.prototype?.softDeletes === true;
    
    if (usesSoftDeletes) {
      const deletedAtColumn = relatedConstructor.deletedAt || 
                              relatedConstructor.DELETED_AT || 
                              'deleted_at';
      this.query.whereNull(deletedAtColumn);
    }
  }

  /**
   * Initialize the relation on a set of models
   */
  initRelation(models: Model[], relation: string): Model[] {
    for (const model of models) {
      model['relations'][relation] = null;
    }
    return models;
  }

  /**
   * Match the eagerly loaded results to their parents
   */
  match(models: Model[], results: any, relation: string): Model[] {
    const dictionary: { [key: string]: any } = {};
    
    // Build dictionary of results keyed by foreign key
    for (const result of results.items || results) {
      const key = result.getAttribute(this.foreignKey);
      dictionary[key] = result;
    }
    
    // Match results to models
    for (const model of models) {
      const key = model.getAttribute(this.localKey);
      if (dictionary[key]) {
        model['relations'][relation] = dictionary[key];
      } else if (this.withDefaultValue !== null || this.withDefaultCallback !== null) {
        // If no match and withDefault is set, use default model
        model['relations'][relation] = this.getDefaultFor(this.query['model']);
      }
    }

    return models;
  }

  /**
   * Get the results of the relationship
   */
  async getResults(): Promise<any> {
    const result = await this.query.first();
    
    // If no result and withDefault is set, return default model
    if (!result && (this.withDefaultValue !== null || this.withDefaultCallback !== null)) {
      return this.getDefaultFor(this.query['model']);
    }
    
    return result;
  }

  /**
   * Get the default value for this relation
   */
  protected getDefaultFor(instance: Model): Model {
    if (this.withDefaultCallback !== null) {
      return this.withDefaultCallback(instance) || instance;
    }

    if (this.withDefaultValue === true) {
      return instance;
    }

    if (this.withDefaultValue instanceof Model) {
      return this.withDefaultValue;
    }

    if (typeof this.withDefaultValue === 'object') {
      return new (instance.constructor as any)(this.withDefaultValue);
    }

    return instance;
  }

  /**
   * Return a new model instance with default attributes or callback
   */
  withDefault(callback: Function | Record<string, any> | boolean = true): this {
    if (typeof callback === 'function') {
      this.withDefaultCallback = callback;
    } else {
      this.withDefaultValue = callback;
    }
    return this;
  }
}
