import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Has one through relationship
 */
export class HasOneThrough extends Relation {
  /**
   * The "through" parent model instance
   */
  protected throughParent: typeof Model;

  /**
   * The far parent model instance
   */
  protected farParent: typeof Model;

  /**
   * The near key on the relationship
   */
  protected firstKey: string;

  /**
   * The far key on the relationship
   */
  protected secondKey: string;

  /**
   * The local key on the relationship
   */
  protected localKey: string;

  /**
   * The local key on the intermediary model
   */
  protected secondLocalKey: string;

  /**
   * Create a new has one through relationship instance
   */
  constructor(
    query: Builder,
    farParent: Model,
    throughParent: typeof Model,
    firstKey: string,
    secondKey: string,
    localKey: string,
    secondLocalKey: string
  ) {
    super(query, farParent);
    
    this.throughParent = throughParent;
    this.farParent = farParent.constructor as typeof Model;
    this.firstKey = firstKey;
    this.secondKey = secondKey;
    this.localKey = localKey;
    this.secondLocalKey = secondLocalKey;
  }

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    const localValue = this.parent.getAttribute(this.localKey);

    this.performJoin();

    if (this.parent.modelExists()) {
      this.query.where(this.getQualifiedFirstKeyName(), '=', localValue);
    }
    
    // Apply soft delete constraint
    const relatedConstructor = this.related.constructor as any;
    const usesSoftDeletes = relatedConstructor.softDeletes === true || 
                            relatedConstructor.prototype?.softDeletes === true;
    
    if (usesSoftDeletes) {
      const deletedAtColumn = relatedConstructor.deletedAt || 
                              relatedConstructor.DELETED_AT || 
                              'deleted_at';
      this.query.whereNull(`${this.related.getTable()}.${deletedAtColumn}`);
    }
  }

  /**
   * Set the join clause on the query
   */
  protected performJoin(): void {
    const throughTable = new this.throughParent().getTable();
    const farTable = this.related.getTable();

    // Join implementation would need join method added to Builder
    // For now, this is a placeholder
    (this.query as any).join(
      throughTable,
      `${throughTable}.${this.secondLocalKey}`,
      '=',
      `${farTable}.${this.secondKey}`
    );
  }

  /**
   * Get the qualified foreign key on the related model
   */
  protected getQualifiedFirstKeyName(): string {
    const throughTable = new this.throughParent().getTable();
    return `${throughTable}.${this.firstKey}`;
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    const keys = models.map(model => model.getAttribute(this.localKey));
    this.query.whereIn(this.getQualifiedFirstKeyName(), keys);
    
    // Apply soft delete constraint for eager loading
    const relatedConstructor = this.related.constructor as any;
    const usesSoftDeletes = relatedConstructor.softDeletes === true || 
                            relatedConstructor.prototype?.softDeletes === true;
    
    if (usesSoftDeletes) {
      const deletedAtColumn = relatedConstructor.deletedAt || 
                              relatedConstructor.DELETED_AT || 
                              'deleted_at';
      this.query.whereNull(`${this.related.getTable()}.${deletedAtColumn}`);
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

    // Build dictionary of results
    for (const result of results.items || results) {
      const key = result.getAttribute(this.firstKey);
      dictionary[key] = result;
    }

    // Match to models
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
