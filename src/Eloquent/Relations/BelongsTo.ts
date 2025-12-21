import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * BelongsTo Relation - inspired by Laravel and Illuminate
 */
export class BelongsTo extends Relation {
  protected foreignKey: string;
  protected ownerKey: string;
  protected withDefaultValue: any = null;
  protected withDefaultCallback: Function | null = null;

  constructor(query: Builder, parent: Model, foreignKey: string, ownerKey: string) {
    super(query, parent);
    this.foreignKey = foreignKey;
    this.ownerKey = ownerKey;
    this.addConstraints();
  }

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    if (this.parent.modelExists()) {
      this.query.where(this.ownerKey, '=', this.parent.getAttribute(this.foreignKey));
      
      // Apply soft delete constraint
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
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    const keys = models
      .map(model => model.getAttribute(this.foreignKey))
      .filter(key => key !== null && key !== undefined);
    
    if (keys.length > 0) {
      this.query.whereIn(this.ownerKey, keys);
    }
    
    // Apply soft delete constraint for eager loading
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

    // Build dictionary of results keyed by owner key
    for (const result of results.items || results) {
      const key = result.getAttribute(this.ownerKey);
      dictionary[key] = result;
    }

    // Match results to models
    for (const model of models) {
      const key = model.getAttribute(this.foreignKey);
      if (key && dictionary[key]) {
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

  /**
   * Associate the model instance to the given parent
   */
  associate(model: Model | null): Model {
    if (model) {
      this.parent.setAttribute(this.foreignKey, model.getAttribute(this.ownerKey));
      this.parent['relations'][this.ownerKey] = model;
    } else {
      this.dissociate();
    }

    return this.parent;
  }

  /**
   * Dissociate previously associated model from the given parent
   */
  dissociate(): Model {
    this.parent.setAttribute(this.foreignKey, null);
    return this.parent;
  }
}
