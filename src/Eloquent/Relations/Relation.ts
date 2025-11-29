import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Base Relation class - inspired by Laravel and Illuminate
 */
export abstract class Relation {
  protected query: Builder;
  protected parent: Model;
  protected related: Model;

  constructor(query: Builder, parent: Model) {
    this.query = query;
    this.parent = parent;
    this.related = query.getModel();
  }

  /**
   * Get the results of the relationship
   */
  abstract getResults(): Promise<any>;

  /**
   * Add the constraints for a relationship query
   */
  abstract addConstraints(): void;

  /**
   * Add the constraints for a relationship count query
   */
  abstract addEagerConstraints(models: Model[]): void;

  /**
   * Initialize the relation on a set of models
   */
  abstract initRelation(models: Model[], relation: string): Model[];

  /**
   * Match the eagerly loaded results to their parents
   */
  abstract match(models: Model[], results: any, relation: string): Model[];

  /**
   * Get the underlying query for the relation
   */
  getQuery(): Builder {
    return this.query;
  }

  /**
   * Get the parent model of the relation
   */
  getParent(): Model {
    return this.parent;
  }

  /**
   * Get the related model of the relation
   */
  getRelated(): Model {
    return this.related;
  }

  /**
   * Execute the query and get all results
   */
  async get(columns: string[] = ['*']): Promise<any> {
    return this.query.get(columns);
  }

  /**
   * Execute the query and get the first result
   */
  async first(columns: string[] = ['*']): Promise<any> {
    return this.query.first(columns);
  }

  /**
   * Add a where clause to the relationship query
   */
  where(...args: any[]): this {
    (this.query as any).where(...args);
    return this;
  }

  /**
   * Add an order by clause to the relationship query
   */
  orderBy(...args: any[]): this {
    (this.query as any).orderBy(...args);
    return this;
  }

  /**
   * Set the limit for the relationship query
   */
  limit(value: number): this {
    (this.query as any).limit(value);
    return this;
  }

  /**
   * Set the offset for the relationship query
   */
  offset(value: number): this {
    (this.query as any).offset(value);
    return this;
  }
}
