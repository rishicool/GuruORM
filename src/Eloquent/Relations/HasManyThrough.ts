import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';
import { Collection } from '../Collection';

/**
 * Has many through relationship
 */
export class HasManyThrough extends Relation {
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
   * Create a new has many through relationship instance
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
  }

  /**
   * Set the join clause on the query
   */
  protected performJoin(): void {
    const throughTable = new this.throughParent().getTable();
    const farTable = this.related.getTable();

    // Use any to bypass type checking for join method
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

    // Build dictionary of results
    for (const result of results.items || results) {
      const key = result.getAttribute(this.firstKey);
      if (!dictionary[key]) {
        dictionary[key] = [];
      }
      dictionary[key].push(result);
    }

    // Match to models
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
}
