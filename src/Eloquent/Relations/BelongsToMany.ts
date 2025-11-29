import { Relation } from './Relation';
import { Model } from '../Model';
import { Builder } from '../Builder';
import { Collection } from '../Collection';

/**
 * BelongsToMany Relation - inspired by Laravel and Illuminate
 */
export class BelongsToMany extends Relation {
  protected table: string;
  protected foreignPivotKey: string;
  protected relatedPivotKey: string;
  protected parentKey: string;
  protected relatedKey: string;

  constructor(
    query: Builder,
    parent: Model,
    table: string,
    foreignPivotKey: string,
    relatedPivotKey: string,
    parentKey: string,
    relatedKey: string
  ) {
    super(query, parent);
    this.table = table;
    this.foreignPivotKey = foreignPivotKey;
    this.relatedPivotKey = relatedPivotKey;
    this.parentKey = parentKey;
    this.relatedKey = relatedKey;
    this.addConstraints();
  }

  /**
   * Set the base constraints on the relation query
   */
  addConstraints(): void {
    this.performJoin();
    
    if (this.parent.modelExists()) {
      this.addWhereConstraints();
    }
  }

  /**
   * Set the join clause for the relation query
   */
  protected performJoin(): void {
    const baseTable = this.related.getTable();
    const key = `${baseTable}.${this.relatedKey}`;

    // Join implementation would need to be added to Builder
    // For now, this is a placeholder
  }

  /**
   * Set the where clause for the relation query
   */
  protected addWhereConstraints(): void {
    this.query.where(
      `${this.table}.${this.foreignPivotKey}`,
      '=',
      this.parent.getAttribute(this.parentKey)
    );
  }

  /**
   * Set the constraints for an eager load of the relation
   */
  addEagerConstraints(models: Model[]): void {
    const keys = models.map(model => model.getAttribute(this.parentKey));
    this.query.whereIn(`${this.table}.${this.foreignPivotKey}`, keys);
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

    // Build dictionary of results keyed by foreign pivot key
    for (const result of results.items || results) {
      const key = result.getAttribute(this.foreignPivotKey);
      if (!dictionary[key]) {
        dictionary[key] = [];
      }
      dictionary[key].push(result);
    }

    // Match results to models
    for (const model of models) {
      const key = model.getAttribute(this.parentKey);
      if (dictionary[key]) {
        model['relations'][relation] = new Collection(dictionary[key]);
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
   * Attach a model to the parent
   */
  async attach(id: any, attributes: Record<string, any> = {}): Promise<void> {
    const records = this.formatAttachRecords([id], attributes);
    
    await this.query.getQuery()
      .from(this.table)
      .insert(records);
  }

  /**
   * Detach models from the relationship
   */
  async detach(ids?: any[]): Promise<number> {
    const query = this.query.getQuery()
      .from(this.table)
      .where(this.foreignPivotKey, this.parent.getAttribute(this.parentKey));

    if (ids) {
      query.whereIn(this.relatedPivotKey, ids);
    }

    return query.delete();
  }

  /**
   * Sync the intermediate tables with a list of IDs
   */
  async sync(ids: any[], detaching: boolean = true): Promise<any> {
    const changes = {
      attached: [] as any[],
      detached: [] as any[],
      updated: [] as any[]
    };

    // Get current IDs
    const current = await this.getCurrentIds();

    // Detach models that are no longer present
    if (detaching) {
      const detach = current.filter(id => !ids.includes(id));
      if (detach.length > 0) {
        await this.detach(detach);
        changes.detached = detach;
      }
    }

    // Attach new models
    const attach = ids.filter(id => !current.includes(id));
    if (attach.length > 0) {
      await this.attachNew(attach);
      changes.attached = attach;
    }

    return changes;
  }

  /**
   * Get the current IDs from the pivot table
   */
  protected async getCurrentIds(): Promise<any[]> {
    const results: any[] = await this.query.getQuery()
      .from(this.table)
      .where(this.foreignPivotKey, this.parent.getAttribute(this.parentKey))
      .select([this.relatedPivotKey])
      .get();

    return results.map((result: any) => result[this.relatedPivotKey]);
  }

  /**
   * Attach new models to the parent
   */
  protected async attachNew(ids: any[]): Promise<void> {
    const records = this.formatAttachRecords(ids, {});
    
    await this.query.getQuery()
      .from(this.table)
      .insert(records);
  }

  /**
   * Format the attach records
   */
  protected formatAttachRecords(ids: any[], attributes: Record<string, any>): any[] {
    return ids.map(id => ({
      [this.foreignPivotKey]: this.parent.getAttribute(this.parentKey),
      [this.relatedPivotKey]: id,
      ...attributes
    }));
  }
}
