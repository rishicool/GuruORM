import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * BelongsTo Relation - inspired by Laravel's BelongsTo
 */
export class BelongsTo extends Relation {
  protected foreignKey: string;
  protected ownerKey: string;

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
