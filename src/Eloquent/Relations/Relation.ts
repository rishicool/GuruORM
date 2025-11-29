import { Model } from '../Model';
import { Builder } from '../Builder';

/**
 * Base Relation class - inspired by Laravel's Relation
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
}
