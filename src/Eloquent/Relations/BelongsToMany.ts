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
  private joinApplied = false;
  protected pivotColumns: string[] = [];
  protected pivotWheres: Array<{ column: string; operator: string; value: any }> = [];
  protected pivotWhereIns: Array<{ column: string; values: any[] }> = [];
  protected withTimestampsFlag = false;
  protected pivotAccessor = 'pivot';

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
    
    this.applySoftDeleteConstraint(this.related.getTable());
    this.applyPivotWheres();
  }

  /**
   * Set the join clause for the relation query.
   * Guarded against being called multiple times (e.g. addConstraints + addEagerConstraints).
   */
  protected performJoin(): void {
    if (this.joinApplied) return;
    this.joinApplied = true;

    const baseTable = this.related.getTable();
    const key = `${baseTable}.${this.relatedKey}`;

    // Join the pivot table to the related model's table
    this.query.join(
      this.table,
      `${this.table}.${this.relatedPivotKey}`,
      '=',
      key
    );
    
    // Select the related model's columns plus pivot keys and extra columns
    const extraPivot = (this.pivotColumns || []);
    const selectColumns = [
      `${baseTable}.*`,
      `${this.table}.${this.foreignPivotKey}`,
      `${this.table}.${this.relatedPivotKey}`,
      ...extraPivot.map(col => `${this.table}.${col}`)
    ];
    this.query.select(...selectColumns);
  }

  /**
   * Apply pivot-specific where clauses
   */
  protected applyPivotWheres(): void {
    for (const pw of (this.pivotWheres || [])) {
      this.query.where(`${this.table}.${pw.column}`, pw.operator, pw.value);
    }
    for (const pwi of (this.pivotWhereIns || [])) {
      this.query.whereIn(`${this.table}.${pwi.column}`, pwi.values);
    }
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
    
    // Ensure join is applied (performJoin has a guard against double application)
    this.performJoin();

    // Select related model columns and pivot columns
    const extraPivotCols = (this.pivotColumns || []);
    const selectColumns = [
      `${this.related.getTable()}.*`,
      `${this.table}.${this.foreignPivotKey}`,
      `${this.table}.${this.relatedPivotKey}`,
      ...extraPivotCols.map(col => `${this.table}.${col}`)
    ];
    this.query.select(...selectColumns);

    // Filter by parent keys
    this.query.whereIn(`${this.table}.${this.foreignPivotKey}`, keys);
    
    this.applySoftDeleteConstraint(this.related.getTable());
    this.applyPivotWheres();
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
   * Attach a model to the parent
   */
  async attach(id: any, attributes: Record<string, any> = {}): Promise<void> {
    const records = this.formatAttachRecords([id], attributes);
    
    await this.newPivotQuery().insert(records);
  }

  /**
   * Detach models from the relationship
   */
  async detach(ids?: any[]): Promise<number> {
    const query = this.newPivotQuery()
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
   * Toggle the relationship between the parent and the given IDs
   */
  async toggle(ids: any[]): Promise<any> {
    const changes = {
      attached: [] as any[],
      detached: [] as any[]
    };

    // Ensure ids is an array
    const idsArray = Array.isArray(ids) ? ids : [ids];

    // Get current IDs
    const current = await this.getCurrentIds();

    // Detach IDs that are currently attached
    const detach = idsArray.filter(id => current.includes(id));
    if (detach.length > 0) {
      await this.detach(detach);
      changes.detached = detach;
    }

    // Attach IDs that are not currently attached
    const attach = idsArray.filter(id => !current.includes(id));
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
    const results: any[] = await this.newPivotQuery()
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
    
    await this.newPivotQuery().insert(records);
  }

  /**
   * Format the attach records
   */
  protected formatAttachRecords(ids: any[], attributes: Record<string, any>): any[] {
    const record: Record<string, any> = {
      ...attributes
    };

    // Add timestamps if enabled
    if (this.withTimestampsFlag) {
      const now = new Date();
      record['created_at'] = now;
      record['updated_at'] = now;
    }

    return ids.map(id => ({
      [this.foreignPivotKey]: this.parent.getAttribute(this.parentKey),
      [this.relatedPivotKey]: id,
      ...record
    }));
  }

  /**
   * Specify extra columns to retrieve from the pivot table.
   * These columns will be available on each related model's `pivot` (or custom accessor) property.
   */
  withPivot(...columns: string[]): this {
    // Flatten in case arrays are passed
    this.pivotColumns.push(...columns.flat());
    return this;
  }

  /**
   * Enable automatic timestamps (created_at, updated_at) on the pivot table.
   */
  withTimestamps(): this {
    this.withTimestampsFlag = true;
    // Also select the timestamp columns
    this.pivotColumns.push('created_at', 'updated_at');
    return this;
  }

  /**
   * Set the accessor name for the pivot data on related models (default: 'pivot').
   */
  as(accessor: string): this {
    this.pivotAccessor = accessor;
    return this;
  }

  /**
   * Add a where clause on a pivot table column.
   */
  wherePivot(column: string, operatorOrValue: any, value?: any): this {
    const op = value === undefined ? '=' : operatorOrValue;
    const val = value === undefined ? operatorOrValue : value;
    this.pivotWheres.push({ column, operator: op, value: val });
    // Apply immediately so calls after construction take effect
    this.query.where(`${this.table}.${column}`, op, val);
    return this;
  }

  /**
   * Add a where-in clause on a pivot table column.
   */
  wherePivotIn(column: string, values: any[]): this {
    this.pivotWhereIns.push({ column, values });
    return this;
  }

  /**
   * Sync without detaching existing relationships (only attach new).
   */
  async syncWithoutDetaching(ids: any[]): Promise<any> {
    return this.sync(ids, false);
  }

  /**
   * Update an existing pivot record.
   */
  async updateExistingPivot(id: any, attributes: Record<string, any>): Promise<number> {
    if (this.withTimestampsFlag) {
      attributes['updated_at'] = new Date();
    }

    return this.newPivotQuery()
      .where(this.foreignPivotKey, this.parent.getAttribute(this.parentKey))
      .where(this.relatedPivotKey, id)
      .update(attributes);
  }

  /**
   * Create a fresh query builder against the pivot table only (no joins).
   */
  protected newPivotQuery(): any {
    return this.query.getQuery().newQuery().from(this.table);
  }

  /**
   * Get the pivot accessor name
   */
  getPivotAccessor(): string {
    return this.pivotAccessor;
  }

  /**
   * Get the pivot columns
   */
  getPivotColumns(): string[] {
    return this.pivotColumns;
  }

  /**
   * Hydrate pivot data on a related model instance.
   * Extracts pivot columns from the model's attributes and attaches
   * them as a sub-object under the pivot accessor name.
   */
  protected hydratePivotRelation(model: any): void {
    const pivotData: Record<string, any> = {};
    pivotData[this.foreignPivotKey] = model.getAttribute?.(this.foreignPivotKey) ?? model[this.foreignPivotKey];
    pivotData[this.relatedPivotKey] = model.getAttribute?.(this.relatedPivotKey) ?? model[this.relatedPivotKey];

    for (const column of this.pivotColumns) {
      pivotData[column] = model.getAttribute?.(column) ?? model[column];
    }

    model[this.pivotAccessor] = pivotData;
  }
}
