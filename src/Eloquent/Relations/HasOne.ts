import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * HasOne Relation - inspired by Laravel's HasOne
 */
export class HasOne extends Relation {
  protected foreignKey: string;
  protected localKey: string;

  constructor(query: Builder, parent: Model, foreignKey: string, localKey: string) {
    super(query, parent);
    this.foreignKey = foreignKey;
    this.localKey = localKey;
    this.addConstraints();
  }

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    if (this.parent.modelExists()) {
      this.query.where(this.foreignKey, '=', this.parent.getAttribute(this.localKey));
    }
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    const keys = models.map(model => model.getAttribute(this.localKey));
    this.query.whereIn(this.foreignKey, keys);
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
      }
    }

    return models;
  }

  /**
   * Get the results of the relationship
   */
  async getResults(): Promise<any> {
    return this.query.first();
  }
}
