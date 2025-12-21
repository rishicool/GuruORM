import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';
import { Collection } from '../Collection';

/**
 * Morph many (polymorphic one-to-many) relationship
 */
export class MorphMany extends Relation {
  /**
   * The foreign key of the parent model
   */
  protected foreignKey: string;

  /**
   * The associated morph type key
   */
  protected morphType: string;

  /**
   * The local key of the parent model
   */
  protected localKey: string;

  /**
   * Create a new morph many relationship instance
   */
  constructor(
    query: Builder,
    parent: Model,
    morphType: string,
    foreignKey: string,
    localKey: string
  ) {
    super(query, parent);
    
    this.morphType = morphType;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
    
    // Add the relationship constraints
    this.addConstraints();
  }

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    if (this.parent.modelExists()) {
      this.query
        .where(this.foreignKey, '=', this.parent.getAttribute(this.localKey))
        .where(this.morphType, '=', this.parent.constructor.name);
      
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
      this.query
        .whereIn(this.foreignKey, keys)
        .where(this.morphType, '=', this.parent.constructor.name);
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
      model['relations'][relation] = new Collection();
    }
    return models;
  }

  /**
   * Match the eagerly loaded results to their parents
   */
  match(models: Model[], results: any, relation: string): Model[] {
    const dictionary: { [key: string]: any[] } = {};

    for (const result of results.items || results) {
      const key = result.getAttribute(this.foreignKey);
      if (!dictionary[key]) {
        dictionary[key] = [];
      }
      dictionary[key].push(result);
    }

    for (const model of models) {
      const key = model.getAttribute(this.localKey);
      if (dictionary[key]) {
        model['relations'][relation] = new Collection(...dictionary[key]);
      }
    }

    return models;
  }

  /**
   * Get the results of the relationship
   */
  async getResults(): Promise<Collection<Model>> {
    const results = await this.query.get();
    
    const instances: Model[] = [];
    for (const attributes of results) {
      const instance = this.related.newInstance(attributes, true);
      instances.push(instance);
    }

    return new Collection(...instances);
  }

  /**
   * Create a new instance of the related model
   */
  async create(attributes: Record<string, any> = {}): Promise<Model> {
    attributes[this.foreignKey] = this.parent.getAttribute(this.localKey);
    attributes[this.morphType] = this.parent.constructor.name;
    
    return this.query.create(attributes);
  }
}
