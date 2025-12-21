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
   * Add a raw where clause to the relationship query
   */
  whereRaw(sql: string, bindings: any[] = [], boolean: 'and' | 'or' = 'and'): this {
    (this.query as any).whereRaw(sql, bindings, boolean);
    return this;
  }

  /**
   * Add an "or where" clause to the relationship query
   */
  orWhere(...args: any[]): this {
    (this.query as any).orWhere(...args);
    return this;
  }

  /**
   * Add a raw "or where" clause to the relationship query
   */
  orWhereRaw(sql: string, bindings: any[] = []): this {
    (this.query as any).orWhereRaw(sql, bindings);
    return this;
  }

  /**
   * Add a "where in" clause to the relationship query
   */
  whereIn(column: string, values: any[]): this {
    (this.query as any).whereIn(column, values);
    return this;
  }

  /**
   * Add a "where not in" clause to the relationship query
   */
  whereNotIn(column: string, values: any[]): this {
    (this.query as any).whereNotIn(column, values);
    return this;
  }

  /**
   * Add a "where null" clause to the relationship query
   */
  whereNull(column: string): this {
    (this.query as any).whereNull(column);
    return this;
  }

  /**
   * Add a "where not null" clause to the relationship query
   */
  whereNotNull(column: string): this {
    (this.query as any).whereNotNull(column);
    return this;
  }

  /**
   * Add a "where between" clause to the relationship query
   */
  whereBetween(column: string, values: [any, any]): this {
    (this.query as any).whereBetween(column, values);
    return this;
  }

  /**
   * Add a "where not between" clause to the relationship query
   */
  whereNotBetween(column: string, values: [any, any]): this {
    (this.query as any).whereNotBetween(column, values);
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
   * Add a raw order by clause to the relationship query
   */
  orderByRaw(sql: string, bindings: any[] = []): this {
    (this.query as any).orderByRaw(sql, bindings);
    return this;
  }

  /**
   * Order by the latest created records
   */
  latest(column: string = 'created_at'): this {
    (this.query as any).latest(column);
    return this;
  }

  /**
   * Order by the oldest created records
   */
  oldest(column: string = 'created_at'): this {
    (this.query as any).oldest(column);
    return this;
  }

  /**
   * Select specific columns
   */
  select(...columns: any[]): this {
    (this.query as any).select(...columns);
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

  /**
   * Get the count of the relationship results
   */
  async count(): Promise<number> {
    return this.query.count();
  }

  /**
   * Make the relation thenable so it can be awaited directly
   */
  then(onfulfilled?: any, onrejected?: any): Promise<any> {
    return this.getResults().then(onfulfilled, onrejected);
  }

  /**
   * Make the relation catchable
   */
  catch(onrejected?: any): Promise<any> {
    return this.getResults().catch(onrejected);
  }
}
