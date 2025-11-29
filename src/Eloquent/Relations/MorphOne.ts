import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Morph one (polymorphic one-to-one) relationship
 */
export class MorphOne extends Relation {
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
   * Create a new morph one relationship instance
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
  }

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    if (this.parent.modelExists()) {
      this.query
        .where(this.foreignKey, '=', this.parent.getAttribute(this.localKey))
        .where(this.morphType, '=', this.parent.constructor.name);
    }
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    const keys = models.map(model => model.getAttribute(this.localKey));
    this.query
      .whereIn(this.foreignKey, keys)
      .where(this.morphType, '=', this.parent.constructor.name);
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

    for (const result of results.items || results) {
      const key = result.getAttribute(this.foreignKey);
      dictionary[key] = result;
    }

    for (const model of models) {
      const key = model.getAttribute(this.localKey);
      if (dictionary[key]) {
        model['relations'][relation] = dictionary[key];
      }
    }

    return models;
  }

  /**
   * Get the results of the relationship
   */
  async getResults(): Promise<Model | null> {
    const results = await this.query.first();
    return results || null;
  }
}
