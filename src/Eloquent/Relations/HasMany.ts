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
      this.applySoftDeleteConstraint();
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
    
    this.applySoftDeleteConstraint();
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

  /**
   * Save multiple related model instances
   */
  async saveMany(models: Model[]): Promise<Model[]> {
    const saved: Model[] = [];
    for (const model of models) {
      saved.push(await this.save(model));
    }
    return saved;
  }

  /**
   * Get the first related record matching the attributes or create it
   */
  async firstOrCreate(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<Model> {
    // Build WHERE conditions directly on the relation query (avoids passing Builder as a value)
    for (const [key, val] of Object.entries(attributes)) {
      this.query.where(key, val);
    }
    const instance = await this.query.first();

    if (instance) return instance;

    return this.create({ ...attributes, ...values });
  }

  /**
   * Get the first related record matching the attributes or instantiate it (no persistence)
   */
  firstOrNew(attributes: Record<string, any>, values: Record<string, any> = {}): Model {
    // This is synchronous — returns an in-memory instance without saving
    const instance = this.related.newInstance();
    instance.setAttribute(this.foreignKey, this.parent.getAttribute(this.localKey));
    instance.forceFill({ ...attributes, ...values });
    return instance;
  }
}
