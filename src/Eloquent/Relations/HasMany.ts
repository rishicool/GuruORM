import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';
import { Collection } from '../Collection';

/**
 * HasMany Relation - inspired by Laravel and Illuminate
 */
export class HasMany extends Relation {
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
      model['relations'][relation] = new Collection([]);
    }
    return models;
  }

  /**
   * Match the eagerly loaded results to their parents
   */
  match(models: Model[], results: any, relation: string): Model[] {
    const dictionary: { [key: string]: any[] } = {};

    // Build dictionary of results keyed by foreign key
    for (const result of results.items || results) {
      const key = result.getAttribute(this.foreignKey);
      if (!dictionary[key]) {
        dictionary[key] = [];
      }
      dictionary[key].push(result);
    }

    // Match results to models
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
  async getResults(): Promise<Collection<any>> {
    return this.query.get();
  }

  /**
   * Create a new instance of the related model
   */
  async create(attributes: Record<string, any> = {}): Promise<Model> {
    attributes[this.foreignKey] = this.parent.getAttribute(this.localKey);
    return this.query.create(attributes);
  }

  /**
   * Create multiple new instances of the related model
   */
  async createMany(records: Record<string, any>[]): Promise<Collection<Model>> {
    const instances: Model[] = [];
    
    for (const record of records) {
      instances.push(await this.create(record));
    }

    return new Collection(...instances);
  }

  /**
   * Save a related model instance
   */
  async save(model: Model): Promise<Model> {
    model.setAttribute(this.foreignKey, this.parent.getAttribute(this.localKey));
    await model.save();
    return model;
  }
}
