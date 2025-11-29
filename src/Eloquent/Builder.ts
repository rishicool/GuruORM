import { Builder as QueryBuilder } from '../Query/Builder';
import { Model } from './Model';
import { Collection } from './Collection';

/**
 * Eloquent Builder - inspired by Laravel and Illuminate
 * Extends the query builder with model-aware functionality
 */
export class Builder {
  protected query: QueryBuilder;
  protected model!: Model;
  protected eagerLoad: Record<string, Function> = {};
  protected localMacros: Record<string, Function> = {};
  protected passthru = [
    'insert', 'insertGetId', 'insertOrIgnore', 'update', 'delete', 'truncate',
    'exists', 'doesntExist', 'count', 'min', 'max', 'avg', 'sum',
    'toSql', 'getBindings'
  ];

  constructor(query: QueryBuilder) {
    this.query = query;
  }

  /**
   * Set the model instance
   */
  setModel(model: Model): this {
    this.model = model;
    this.query.from(model.getTable());
    return this;
  }

  /**
   * Get the model being queried
   */
  getModel(): Model {
    return this.model;
  }

  /**
   * Get the underlying query builder instance
   */
  getQuery(): QueryBuilder {
    return this.query;
  }

  /**
   * Find a model by its primary key
   */
  async find(id: any, columns: string[] = ['*']): Promise<any> {
    if (Array.isArray(id)) {
      return this.findMany(id, columns);
    }

    return this.whereKey(id).first(columns);
  }

  /**
   * Find multiple models by their primary keys
   */
  async findMany(ids: any[], columns: string[] = ['*']): Promise<Collection<any>> {
    if (ids.length === 0) {
      return new Collection([]);
    }

    return this.whereKey(ids).get(columns);
  }

  /**
   * Find a model by its primary key or throw an exception
   */
  async findOrFail(id: any, columns: string[] = ['*']): Promise<any> {
    const result = await this.find(id, columns);

    if (Array.isArray(id)) {
      if (result.count() !== id.length) {
        throw new Error('Some models were not found');
      }
      return result;
    }

    if (!result) {
      throw new Error(`No query results for model with ID: ${id}`);
    }

    return result;
  }

  /**
   * Execute the query and get the first result
   */
  async first(columns: string[] = ['*']): Promise<any> {
    const results = await this.take(1).get(columns);
    return results.first() || null;
  }

  /**
   * Execute the query and get the first result or throw an exception
   */
  async firstOrFail(columns: string[] = ['*']): Promise<any> {
    const model = await this.first(columns);

    if (!model) {
      throw new Error('No query results for model');
    }

    return model;
  }

  /**
   * Find a model by its primary key or return fresh model instance
   */
  async firstOr(columns: string[] = ['*'], callback?: Function): Promise<any> {
    const model = await this.first(columns);

    if (model) {
      return model;
    }

    if (callback) {
      return callback();
    }

    return this.newModelInstance();
  }

  /**
   * Get the first record matching the attributes or create it
   */
  async firstOrCreate(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<any> {
    const instance = await this.where(attributes).first();

    if (instance) {
      return instance;
    }

    return this.create({ ...attributes, ...values });
  }

  /**
   * Get the first record matching the attributes or instantiate it
   */
  async firstOrNew(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<any> {
    const instance = await this.where(attributes).first();

    if (instance) {
      return instance;
    }

    return this.newModelInstance({ ...attributes, ...values });
  }

  /**
   * Create or update a record matching the attributes, and fill it with values
   */
  async updateOrCreate(attributes: Record<string, any>, values: Record<string, any> = {}): Promise<any> {
    const instance = await this.firstOrNew(attributes);

    instance.fill(values);
    await instance.save();

    return instance;
  }

  /**
   * Execute the query as a "select" statement
   */
  async get(columns: string[] = ['*']): Promise<Collection<any>> {
    const builder = this.applyScopes();
    
    const models = await builder.getModels(columns);

    // If we have eager loads, load them now
    if (Object.keys(this.eagerLoad).length > 0) {
      const eagerModels = await builder.eagerLoadRelations(models as any[]);
      return new Collection(...eagerModels);
    }

    return models;
  }

  /**
   * Get the hydrated models without eager loading
   */
  async getModels(columns: string[] = ['*']): Promise<Collection<any>> {
    const results = await this.query.get(columns);
    return this.hydrate(results);
  }

  /**
   * Create a collection of models from plain arrays
   */
  hydrate(items: any[]): Collection<any> {
    const models = items.map(item => this.newModelInstance(item, true));
    return new Collection(...models);
  }

  /**
   * Get an array of a single column's values
   */
  async pluck(column: string): Promise<any[]> {
    const results = await this.query.pluck(column);
    return results;
  }

  /**
   * Create a new instance of the model
   */
  newModelInstance(attributes: Record<string, any> = {}, exists = false): any {
    return this.model.newInstance(attributes, exists);
  }

  /**
   * Eager load the relationships for the models
   */
  protected async eagerLoadRelations(models: any[]): Promise<any[]> {
    for (const [name, constraints] of Object.entries(this.eagerLoad)) {
      // Check if this is a nested relation (e.g., 'posts.comments')
      if (name.includes('.')) {
        models = await this.eagerLoadNestedRelation(models, name, constraints);
      } else {
        models = await this.eagerLoadRelation(models, name, constraints);
      }
    }

    return models;
  }

  /**
   * Eagerly load a nested relationship on a set of models
   */
  protected async eagerLoadNestedRelation(models: any[], name: string, constraints: Function): Promise<any[]> {
    const segments = name.split('.');
    const firstRelation = segments[0];
    
    // Check if the first level relation is already being loaded separately
    // If not, we need to load it ourselves
    if (!this.eagerLoad[firstRelation]) {
      models = await this.eagerLoadRelation(models, firstRelation, (q: any) => q);
    }
    
    // If there are more segments, recursively load nested relations
    if (segments.length > 1) {
      const nestedRelation = segments.slice(1).join('.');
      
      // For each model, load nested relations on the first level relation
      for (const model of models) {
        // Access the relation through the proxy (model[firstRelation] will use getAttribute)
        const relation = model.relations?.[firstRelation];
        
        if (relation) {
          if (Array.isArray(relation) || (relation && typeof relation[Symbol.iterator] === 'function')) {
            // If it's a collection or iterable, load nested relations for each item
            for (const relatedModel of relation) {
              if (relatedModel && typeof relatedModel.load === 'function') {
                await relatedModel.load(nestedRelation);
              }
            }
          } else if (relation && typeof relation.load === 'function') {
            // If it's a single model, load the nested relation
            await relation.load(nestedRelation);
          }
        }
      }
    }
    
    return models;
  }

  /**
   * Eagerly load the relationship on a set of models
   */
  protected async eagerLoadRelation(models: any[], name: string, constraints: Function): Promise<any[]> {
    // Get the relation instance
    const relation = this.getRelation(name);
    
    // Apply constraints
    constraints(relation.getQuery());
    
    // Add eager constraints
    relation.addEagerConstraints(models);
    
    // Get results
    const results = await relation.getQuery().get();
    
    // Match results to models
    return relation.match(models, results, name);
  }

  /**
   * Get the relation instance for the given relation name
   */
  protected getRelation(name: string): any {
    // Get the raw model (without Proxy interference) to access the method
    // Use Reflect.get to ensure we get the actual method from prototype
    const method = Reflect.get(Object.getPrototypeOf(this.model), name);
    
    if (typeof method !== 'function') {
      throw new Error(`Relation '${name}' is not defined on model.`);
    }
    
    // Call the relationship method on the model
    const relation = method.call(this.model);
    
    if (!relation || typeof relation.addEagerConstraints !== 'function') {
      throw new Error(`Relation '${name}' is not defined on model.`);
    }
    
    return relation;
  }

  /**
   * Add a relationship to be eager loaded
   */
  with(relations: string | string[] | Record<string, Function>): this {
    if (typeof relations === 'string') {
      relations = [relations];
    }

    if (Array.isArray(relations)) {
      for (const relation of relations) {
        this.eagerLoad[relation] = (query: any) => query;
      }
    } else {
      for (const [relation, constraints] of Object.entries(relations)) {
        this.eagerLoad[relation] = constraints;
      }
    }

    return this;
  }

  /**
   * Add a relationship count to be eager loaded
   */
  withCount(relations: string | string[] | Record<string, Function>): this {
    // TODO: Implement proper relationship counting with subqueries
    // For now, this is a placeholder to prevent crashes
    // Proper implementation requires building a correlated subquery based on the relationship definition
    return this;
  }

  /**
   * Add a where clause based on a relationship's existence
   */
  has(relation: string, operator: string = '>=', count: number = 1): this {
    // TODO: Implement proper relationship existence queries with EXISTS subqueries
    // For now, return this to prevent crashes
    return this;
  }

  /**
   * Add a where clause based on a relationship's existence with callback
   */
  whereHas(relation: string, callback?: Function, operator: string = '>=', count: number = 1): this {
    // TODO: Implement proper relationship existence queries with EXISTS subqueries
    return this;
  }

  /**
   * Add a where clause that requires a relationship to NOT exist
   */
  doesntHave(relation: string): this {
    // TODO: Implement proper relationship non-existence queries with NOT EXISTS subqueries
    return this;
  }

  /**
   * Add a where clause that requires a relationship to NOT exist with callback
   */
  whereDoesntHave(relation: string, callback?: Function): this {
    // TODO: Implement proper relationship non-existence queries with NOT EXISTS subqueries
    return this;
  }

  /**
   * Add an "or where" clause based on a relationship's existence
   */
  orWhereHas(relation: string, callback?: Function, operator: string = '>=', count: number = 1): this {
    // Implementation similar to whereHas but with OR logic
    return this;
  }

  /**
   * Add an "or where" clause that requires a relationship to NOT exist
   */
  orWhereDoesntHave(relation: string, callback?: Function): this {
    // Implementation similar to whereDoesntHave but with OR logic
    return this;
  }

  /**
   * Save a new model and return the instance
   */
  async create(attributes: Record<string, any> = {}): Promise<any> {
    const instance = this.newModelInstance(attributes);
    await instance.save();
    return instance;
  }

  /**
   * Create a collection of models
   */
  async createMany(records: Record<string, any>[]): Promise<Collection<any>> {
    const instances = [];

    for (const record of records) {
      instances.push(await this.create(record));
    }

    return new Collection(instances);
  }

  /**
   * Add a where clause on the primary key to the query
   */
  whereKey(id: any): this {
    if (Array.isArray(id)) {
      this.query.whereIn(this.model.getKeyName(), id);
      return this;
    }

    this.query.where(this.model.getKeyName(), '=', id);
    return this;
  }

  /**
   * Add a where clause on the primary key to the query (not equal)
   */
  whereKeyNot(id: any): this {
    if (Array.isArray(id)) {
      this.query.whereNotIn(this.model.getKeyName(), id);
      return this;
    }

    this.query.where(this.model.getKeyName(), '!=', id);
    return this;
  }

  /**
   * Apply the scopes to the Eloquent builder instance and return it
   */
  protected applyScopes(): this {
    // Scopes will be implemented later
    return this;
  }

  /**
   * Get all models
   */
  async all(columns: string[] = ['*']): Promise<Collection<any>> {
    return this.get(columns);
  }

  /**
   * Get a single column's value from the first result of a query
   */
  async value(column: string): Promise<any> {
    const result = await this.first([column]);
    return result ? result.getAttribute(column) : null;
  }

  /**
   * Chunk the results of the query
   */
  async chunk(count: number, callback: (results: Collection<any>, page: number) => boolean | void): Promise<boolean> {
    return this.query.chunk(count, (results: any[], page: number) => {
      const models = this.hydrate(results);
      return callback(models, page);
    });
  }

  /**
   * Chunk the results of a query by comparing IDs
   */
  async chunkById(count: number, callback: (results: Collection<any>, lastId?: any) => boolean | void, column?: string): Promise<boolean> {
    column = column || this.model.getKeyName();
    
    return this.query.chunkById(count, (results: any[], lastId?: any) => {
      const models = this.hydrate(results);
      return callback(models, lastId);
    }, column);
  }

  /**
   * Execute a callback over each item while chunking
   */
  async each(callback: (model: any, index: number) => boolean | void, count: number = 1000): Promise<boolean> {
    let index = 0;

    return this.chunk(count, (results: Collection<any>) => {
      for (const model of results) {
        if (callback(model, index) === false) {
          return false;
        }
        index++;
      }
      return true;
    });
  }

  /**
   * Get a lazy collection for the given query
   */
  async *lazy(chunkSize: number = 1000): AsyncGenerator<any> {
    const generator = this.query.lazy(chunkSize);

    for await (const item of generator) {
      yield this.newModelInstance(item, true);
    }
  }

  /**
   * Get a lazy collection for the given query by ID
   */
  async *lazyById(chunkSize: number = 1000, column?: string): AsyncGenerator<any> {
    column = column || this.model.getKeyName();
    const generator = this.query.lazyById(chunkSize, column);

    for await (const item of generator) {
      yield this.newModelInstance(item, true);
    }
  }

  /**
   * Dynamically handle calls to the query builder
   */
  private proxyToQueryBuilder(method: string, parameters: any[]): any {
    const result = (this.query as any)[method](...parameters);

    // If the result is the query builder, return this builder for chaining
    if (result === this.query) {
      return this;
    }

    return result;
  }

  // Proxy methods to query builder
  where(...args: any[]): this { return this.proxyToQueryBuilder('where', args); }
  orWhere(...args: any[]): this { return this.proxyToQueryBuilder('orWhere', args); }
  whereNot(...args: any[]): this { return this.proxyToQueryBuilder('whereNot', args); }
  orWhereNot(...args: any[]): this { return this.proxyToQueryBuilder('orWhereNot', args); }
  whereIn(...args: any[]): this { return this.proxyToQueryBuilder('whereIn', args); }
  whereNotIn(...args: any[]): this { return this.proxyToQueryBuilder('whereNotIn', args); }
  orWhereIn(...args: any[]): this { return this.proxyToQueryBuilder('orWhereIn', args); }
  orWhereNotIn(...args: any[]): this { return this.proxyToQueryBuilder('orWhereNotIn', args); }
  whereBetween(...args: any[]): this { return this.proxyToQueryBuilder('whereBetween', args); }
  whereNotBetween(...args: any[]): this { return this.proxyToQueryBuilder('whereNotBetween', args); }
  orWhereBetween(...args: any[]): this { return this.proxyToQueryBuilder('orWhereBetween', args); }
  orWhereNotBetween(...args: any[]): this { return this.proxyToQueryBuilder('orWhereNotBetween', args); }
  whereNull(...args: any[]): this { return this.proxyToQueryBuilder('whereNull', args); }
  whereNotNull(...args: any[]): this { return this.proxyToQueryBuilder('whereNotNull', args); }
  orWhereNull(...args: any[]): this { return this.proxyToQueryBuilder('orWhereNull', args); }
  orWhereNotNull(...args: any[]): this { return this.proxyToQueryBuilder('orWhereNotNull', args); }
  whereColumn(...args: any[]): this { return this.proxyToQueryBuilder('whereColumn', args); }
  orWhereColumn(...args: any[]): this { return this.proxyToQueryBuilder('orWhereColumn', args); }
  whereExists(...args: any[]): this { return this.proxyToQueryBuilder('whereExists', args); }
  whereNotExists(...args: any[]): this { return this.proxyToQueryBuilder('whereNotExists', args); }
  orWhereExists(...args: any[]): this { return this.proxyToQueryBuilder('orWhereExists', args); }
  orWhereNotExists(...args: any[]): this { return this.proxyToQueryBuilder('orWhereNotExists', args); }
  whereDate(...args: any[]): this { return this.proxyToQueryBuilder('whereDate', args); }
  whereTime(...args: any[]): this { return this.proxyToQueryBuilder('whereTime', args); }
  whereDay(...args: any[]): this { return this.proxyToQueryBuilder('whereDay', args); }
  whereMonth(...args: any[]): this { return this.proxyToQueryBuilder('whereMonth', args); }
  whereYear(...args: any[]): this { return this.proxyToQueryBuilder('whereYear', args); }
  whereJsonContains(...args: any[]): this { return this.proxyToQueryBuilder('whereJsonContains', args); }
  whereJsonDoesntContain(...args: any[]): this { return this.proxyToQueryBuilder('whereJsonDoesntContain', args); }
  whereJsonLength(...args: any[]): this { return this.proxyToQueryBuilder('whereJsonLength', args); }
  whereFullText(...args: any[]): this { return this.proxyToQueryBuilder('whereFullText', args); }
  orWhereFullText(...args: any[]): this { return this.proxyToQueryBuilder('orWhereFullText', args); }
  select(...args: any[]): this { return this.proxyToQueryBuilder('select', args); }
  selectRaw(...args: any[]): this { return this.proxyToQueryBuilder('selectRaw', args); }
  addSelect(...args: any[]): this { return this.proxyToQueryBuilder('addSelect', args); }
  distinct(...args: any[]): this { return this.proxyToQueryBuilder('distinct', args); }
  from(...args: any[]): this { return this.proxyToQueryBuilder('from', args); }
  join(...args: any[]): this { return this.proxyToQueryBuilder('join', args); }
  leftJoin(...args: any[]): this { return this.proxyToQueryBuilder('leftJoin', args); }
  rightJoin(...args: any[]): this { return this.proxyToQueryBuilder('rightJoin', args); }
  crossJoin(...args: any[]): this { return this.proxyToQueryBuilder('crossJoin', args); }
  orderBy(...args: any[]): this { return this.proxyToQueryBuilder('orderBy', args); }
  orderByDesc(...args: any[]): this { return this.proxyToQueryBuilder('orderByDesc', args); }
  latest(...args: any[]): this { return this.proxyToQueryBuilder('latest', args); }
  oldest(...args: any[]): this { return this.proxyToQueryBuilder('oldest', args); }
  inRandomOrder(...args: any[]): this { return this.proxyToQueryBuilder('inRandomOrder', args); }
  reorder(...args: any[]): this { return this.proxyToQueryBuilder('reorder', args); }
  groupBy(...args: any[]): this { return this.proxyToQueryBuilder('groupBy', args); }
  groupByRaw(...args: any[]): this { return this.proxyToQueryBuilder('groupByRaw', args); }
  having(...args: any[]): this { return this.proxyToQueryBuilder('having', args); }
  orHaving(...args: any[]): this { return this.proxyToQueryBuilder('orHaving', args); }
  havingRaw(...args: any[]): this { return this.proxyToQueryBuilder('havingRaw', args); }
  orHavingRaw(...args: any[]): this { return this.proxyToQueryBuilder('orHavingRaw', args); }
  havingBetween(...args: any[]): this { return this.proxyToQueryBuilder('havingBetween', args); }
  limit(...args: any[]): this { return this.proxyToQueryBuilder('limit', args); }
  take(...args: any[]): this { return this.proxyToQueryBuilder('take', args); }
  offset(...args: any[]): this { return this.proxyToQueryBuilder('offset', args); }
  skip(...args: any[]): this { return this.proxyToQueryBuilder('skip', args); }
  forPage(...args: any[]): this { return this.proxyToQueryBuilder('forPage', args); }
  when(...args: any[]): this { return this.proxyToQueryBuilder('when', args); }
  unless(...args: any[]): this { return this.proxyToQueryBuilder('unless', args); }

  // Passthrough methods that return their results directly
  async insert(values: any): Promise<boolean> { return this.query.insert(values); }
  async insertGetId(values: any, sequence?: string): Promise<number> { return this.query.insertGetId(values, sequence); }
  async insertOrIgnore(values: any): Promise<number> { return this.query.insertOrIgnore(values); }
  async update(values: Record<string, any>): Promise<number> { return this.query.update(values); }
  async increment(column: string, amount: number = 1, extra: Record<string, any> = {}): Promise<number> { return this.query.increment(column, amount, extra); }
  async decrement(column: string, amount: number = 1, extra: Record<string, any> = {}): Promise<number> { return this.query.decrement(column, amount, extra); }
  async delete(id?: any): Promise<number> { return this.query.delete(id); }
  async truncate(): Promise<void> { return this.query.truncate(); }
  async exists(): Promise<boolean> { return this.query.exists(); }
  async doesntExist(): Promise<boolean> { return this.query.doesntExist(); }
  async count(column: string = '*'): Promise<number> { return this.query.count(column); }
  async min(column: string): Promise<number> { return this.query.min(column); }
  async max(column: string): Promise<number> { return this.query.max(column); }
  async avg(column: string): Promise<number> { return this.query.avg(column); }
  async sum(column: string): Promise<number> { return this.query.sum(column); }
  toSql(): string { return this.query.toSql(); }
  getBindings(): any[] { return this.query.getBindings(); }

  /**
   * Paginate the given query
   */
  async paginate(perPage: number = 15, page: number = 1): Promise<any> {
    const result = await this.query.paginate(perPage, page);
    
    return {
      ...result,
      data: this.hydrate(result.data),
    };
  }

  /**
   * Get a paginator only supporting simple next and previous links
   */
  async simplePaginate(perPage: number = 15, page: number = 1): Promise<any> {
    const result = await this.query.simplePaginate(perPage, page);
    
    return {
      ...result,
      data: this.hydrate(result.data),
    };
  }

  /**
   * Apply a scope to the query
   */
  scopes(scopes: string[] | Record<string, any>): this {
    const scopesArray = Array.isArray(scopes) ? scopes : Object.keys(scopes);
    const scopeParams = Array.isArray(scopes) ? {} : scopes;

    for (const scope of scopesArray) {
      const methodName = `scope${scope.charAt(0).toUpperCase() + scope.slice(1)}`;
      const params = scopeParams[scope] || [];
      
      if (typeof (this.model as any)[methodName] === 'function') {
        (this.model as any)[methodName](this, ...params);
      }
    }

    return this;
  }

  /**
   * Dynamically call local scopes
   */
  callScope(scope: string, parameters: any[] = []): this {
    return this.scopes({ [scope]: parameters });
  }
}
