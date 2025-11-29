import { Connection } from '../Connection/Connection';
import { Grammar } from './Grammars/Grammar';
import { Processor } from './Processors/Processor';
import { Expression } from './Expression';
import { JoinClause } from './JoinClause';

/**
 * Query Builder - inspired by Laravel's Query Builder
 * Provides a fluent interface for building SQL queries
 */
export class Builder {
  protected connection: Connection;
  protected grammar: Grammar;
  protected processor: Processor;
  
  // Query components
  protected columns: any[] = [];
  protected fromTable: string | null = null;
  protected fromAlias: string | null = null;
  protected joins: any[] = [];
  protected wheres: any[] = [];
  protected groups: any[] = [];
  protected havings: any[] = [];
  protected orders: any[] = [];
  protected limitValue: number | null = null;
  protected offsetValue: number | null = null;
  protected unions: any[] = [];
  protected lock: boolean | string = false;
  
  // Bindings for prepared statements
  protected bindings: {
    select: any[];
    from: any[];
    join: any[];
    where: any[];
    groupBy: any[];
    having: any[];
    order: any[];
    union: any[];
    unionOrder: any[];
  } = {
    select: [],
    from: [],
    join: [],
    where: [],
    groupBy: [],
    having: [],
    order: [],
    union: [],
    unionOrder: [],
  };

  constructor(connection: Connection, grammar?: Grammar, processor?: Processor) {
    this.connection = connection;
    this.grammar = grammar || connection.getQueryGrammar();
    this.processor = processor || connection.getPostProcessor();
  }

  /**
   * Set the columns to be selected
   */
  select(...columns: any[]): this {
    this.columns = columns.length === 0 ? ['*'] : columns;
    return this;
  }

  /**
   * Add a new select column to the query
   */
  addSelect(...columns: any[]): this {
    this.columns = [...this.columns, ...columns];
    return this;
  }

  /**
   * Set the table which the query is targeting
   */
  from(table: string, as?: string): this {
    this.fromTable = table;
    if (as) {
      this.fromAlias = as;
    }
    return this;
  }

  /**
   * Add a join clause to the query
   */
  join(table: string, first: string | Function, operator?: string | null, second?: string | null, type: 'inner' | 'left' | 'right' | 'cross' = 'inner', where = false): this {
    const join = new JoinClause(table, type);

    // Handle closure for complex join conditions
    if (typeof first === 'function') {
      first(join);
      this.joins.push(join);
      this.addBinding(join.getBindings(), 'join');
      return this;
    }

    // Add simple on clause
    const method = where ? 'where' : 'on';
    (join as any)[method](first, operator, second);
    
    this.joins.push(join);
    return this;
  }

  /**
   * Add a left join to the query
   */
  leftJoin(table: string, first: string | Function, operator?: string | null, second?: string | null): this {
    return this.join(table, first, operator, second, 'left');
  }

  /**
   * Add a right join to the query
   */
  rightJoin(table: string, first: string | Function, operator?: string | null, second?: string | null): this {
    return this.join(table, first, operator, second, 'right');
  }

  /**
   * Add a cross join to the query
   */
  crossJoin(table: string): this {
    this.joins.push({ type: 'cross', table });
    return this;
  }

  /**
   * Add a join with a where clause
   */
  joinWhere(table: string, first: string, operator: string, second: string, type: 'inner' | 'left' | 'right' = 'inner'): this {
    return this.join(table, first, operator, second, type, true);
  }

  /**
   * Add a left join with a where clause
   */
  leftJoinWhere(table: string, first: string, operator: string, second: string): this {
    return this.joinWhere(table, first, operator, second, 'left');
  }

  /**
   * Add a union statement to the query
   */
  union(query: Builder | Function, all = false): this {
    if (typeof query === 'function') {
      const callback = query;
      query = this.newQuery();
      callback(query);
    }

    this.unions.push({ query, all });
    this.addBinding(query.getBindings(), 'union');

    return this;
  }

  /**
   * Add a union all statement to the query
   */
  unionAll(query: Builder | Function): this {
    return this.union(query, true);
  }

  /**
   * Add a basic where clause to the query
   */
  where(column: string | Function, operator?: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    // Handle closure for nested where
    if (typeof column === 'function') {
      return this.whereNested(column, boolean);
    }

    // Handle two arguments (column, value)
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Basic',
      column,
      operator,
      value,
      boolean,
    });

    if (!(value instanceof Expression)) {
      this.addBinding(value, 'where');
    }

    return this;
  }

  /**
   * Add an "or where" clause to the query
   */
  orWhere(column: string | Function, operator?: any, value?: any): this {
    return this.where(column, operator, value, 'or');
  }

  /**
   * Add a nested where statement to the query
   */
  whereNested(callback: Function, boolean: 'and' | 'or' = 'and'): this {
    const query = this.forNestedWhere();
    callback(query);

    return this.addNestedWhereQuery(query, boolean);
  }

  /**
   * Create a new query instance for nested where condition
   */
  protected forNestedWhere(): Builder {
    return new Builder(this.connection, this.grammar, this.processor);
  }

  /**
   * Add another query builder as a nested where to the query builder
   */
  protected addNestedWhereQuery(query: Builder, boolean: 'and' | 'or' = 'and'): this {
    if (query.wheres.length > 0) {
      this.wheres.push({
        type: 'Nested',
        query,
        boolean,
      });

      this.addBinding(query.getBindings(), 'where');
    }

    return this;
  }

  /**
   * Add a "where in" clause to the query
   */
  whereIn(column: string, values: any[], boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'NotIn' : 'In';

    this.wheres.push({
      type,
      column,
      values,
      boolean,
    });

    this.addBinding(values, 'where');

    return this;
  }

  /**
   * Add an "or where in" clause to the query
   */
  orWhereIn(column: string, values: any[]): this {
    return this.whereIn(column, values, 'or');
  }

  /**
   * Add a "where not in" clause to the query
   */
  whereNotIn(column: string, values: any[]): this {
    return this.whereIn(column, values, 'and', true);
  }

  /**
   * Add a "where null" clause to the query
   */
  whereNull(column: string, boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'NotNull' : 'Null';

    this.wheres.push({
      type,
      column,
      boolean,
    });

    return this;
  }

  /**
   * Add an "or where null" clause to the query
   */
  orWhereNull(column: string): this {
    return this.whereNull(column, 'or');
  }

  /**
   * Add a "where not null" clause to the query
   */
  whereNotNull(column: string, boolean: 'and' | 'or' = 'and'): this {
    return this.whereNull(column, boolean, true);
  }

  /**
   * Add a where clause with a subquery
   */
  whereSub(column: string, operator: string, callback: (query: Builder) => void, boolean: 'and' | 'or' = 'and'): this {
    const query = this.newQuery();
    callback(query);

    this.wheres.push({
      type: 'Sub',
      column,
      operator,
      query,
      boolean,
    });

    this.addBinding(query.getBindings(), 'where');
    return this;
  }

  /**
   * Add a where in clause with a subquery
   */
  whereInSub(column: string, callback: (query: Builder) => void, boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'NotInSub' : 'InSub';
    const query = this.newQuery();
    callback(query);

    this.wheres.push({
      type,
      column,
      query,
      boolean,
    });

    this.addBinding(query.getBindings(), 'where');
    return this;
  }

  /**
   * Add a where not in clause with a subquery
   */
  whereNotInSub(column: string, callback: (query: Builder) => void, boolean: 'and' | 'or' = 'and'): this {
    return this.whereInSub(column, callback, boolean, true);
  }

  /**
   * Add a where exists clause
   */
  whereExists(callback: (query: Builder) => void, boolean: 'and' | 'or' = 'and', not = false): this {
    const query = this.newQuery();
    callback(query);

    this.wheres.push({
      type: not ? 'NotExists' : 'Exists',
      query,
      boolean,
    });

    this.addBinding(query.getBindings(), 'where');
    return this;
  }

  /**
   * Add a where not exists clause
   */
  whereNotExists(callback: (query: Builder) => void, boolean: 'and' | 'or' = 'and'): this {
    return this.whereExists(callback, boolean, true);
  }

  /**
   * Add a where between clause
   */
  whereBetween(column: string, values: [any, any], boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'NotBetween' : 'Between';

    this.wheres.push({
      type,
      column,
      values,
      boolean,
    });

    this.addBinding(values, 'where');
    return this;
  }

  /**
   * Add a where not between clause
   */
  whereNotBetween(column: string, values: [any, any], boolean: 'and' | 'or' = 'and'): this {
    return this.whereBetween(column, values, boolean, true);
  }

  /**
   * Add a where date clause
   */
  whereDate(column: string, operator: string, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Date',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a where time clause
   */
  whereTime(column: string, operator: string, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Time',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a where column clause
   */
  whereColumn(first: string, operator: string, second?: string, boolean: 'and' | 'or' = 'and'): this {
    if (second === undefined) {
      second = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Column',
      first,
      operator,
      second,
      boolean,
    });

    return this;
  }

  /**
   * Add an "order by" clause to the query
   */
  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orders.push({
      column,
      direction: direction.toLowerCase(),
    });

    return this;
  }

  /**
   * Add a descending "order by" clause to the query
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'desc');
  }

  /**
   * Add a "group by" clause to the query
   */
  groupBy(...groups: string[]): this {
    groups.forEach((group) => {
      this.groups.push(group);
    });
    return this;
  }

  /**
   * Add a "having" clause to the query
   */
  having(column: string, operator?: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.havings.push({
      type: 'Basic',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'having');
    return this;
  }

  /**
   * Add a raw "having" clause to the query
   */
  havingRaw(sql: string, bindings: any[] = [], boolean: 'and' | 'or' = 'and'): this {
    this.havings.push({
      type: 'Raw',
      sql,
      boolean,
    });

    this.addBinding(bindings, 'having');
    return this;
  }

  /**
   * Add a raw select expression
   */
  selectRaw(expression: string, bindings: any[] = []): this {
    this.columns.push(new Expression(expression));
    this.addBinding(bindings, 'select');
    return this;
  }

  /**
   * Add a raw where clause
   */
  whereRaw(sql: string, bindings: any[] = [], boolean: 'and' | 'or' = 'and'): this {
    this.wheres.push({
      type: 'Raw',
      sql,
      boolean,
    });

    this.addBinding(bindings, 'where');
    return this;
  }

  /**
   * Add a raw order by clause
   */
  orderByRaw(sql: string, bindings: any[] = []): this {
    this.orders.push({
      type: 'Raw',
      sql,
    });

    this.addBinding(bindings, 'order');
    return this;
  }

  /**
   * Force the query to only return distinct results
   */
  distinct(): this {
    this.columns.unshift('distinct');
    return this;
  }

  /**
   * Set the "limit" value of the query
   */
  limit(value: number): this {
    this.limitValue = value >= 0 ? value : null;
    return this;
  }

  /**
   * Alias to set the "limit" value of the query
   */
  take(value: number): this {
    return this.limit(value);
  }

  /**
   * Set the "offset" value of the query
   */
  offset(value: number): this {
    this.offsetValue = Math.max(0, value);
    return this;
  }

  /**
   * Alias to set the "offset" value of the query
   */
  skip(value: number): this {
    return this.offset(value);
  }

  /**
   * Add a binding to the query
   */
  addBinding(value: any, type: keyof typeof this.bindings = 'where'): this {
    if (!this.bindings[type]) {
      throw new Error(`Invalid binding type: ${type}`);
    }

    if (Array.isArray(value)) {
      this.bindings[type] = [...this.bindings[type], ...value];
    } else {
      this.bindings[type].push(value);
    }

    return this;
  }

  /**
   * Get the current query value bindings
   */
  getBindings(): any[] {
    return Object.values(this.bindings).flat();
  }

  /**
   * Get the raw query bindings
   */
  getRawBindings(): typeof this.bindings {
    return this.bindings;
  }

  /**
   * Execute the query as a "select" statement
   */
  async get(columns: string[] = ['*']): Promise<any[]> {
    const original = this.columns;

    if (original.length === 0 || original[0] === '*') {
      this.columns = columns;
    }

    const results = await this.runSelect();

    this.columns = original;

    return results;
  }

  /**
   * Run the query as a "select" statement
   */
  protected async runSelect(): Promise<any[]> {
    const sql = this.toSql();
    const bindings = this.getBindings();

    return this.connection.select(sql, bindings);
  }

  /**
   * Execute the query and get the first result
   */
  async first(columns: string[] = ['*']): Promise<any> {
    const results = await this.take(1).get(columns);
    return results[0] || null;
  }

  /**
   * Insert new records into the database
   */
  async insert(values: any[] | any): Promise<boolean> {
    if (Array.isArray(values) && values.length === 0) {
      return true;
    }

    const valuesArray = Array.isArray(values[0]) ? values : [values];
    
    const sql = this.grammar.compileInsert(this, valuesArray);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, valuesArray);

    return this.connection.insert(sql, bindings);
  }

  /**
   * Update records in the database
   */
  async update(values: any): Promise<number> {
    const sql = this.grammar.compileUpdate(this, values);
    const bindings = this.grammar.prepareBindingsForUpdate(this.bindings, values);

    return this.connection.update(sql, bindings);
  }

  /**
   * Delete records from the database
   */
  async delete(id?: any): Promise<number> {
    if (id !== undefined) {
      this.where('id', '=', id);
    }

    const sql = this.grammar.compileDelete(this);
    const bindings = this.getBindings();

    return this.connection.delete(sql, bindings);
  }

  /**
   * Retrieve the "count" result of the query
   */
  async count(columns: string = '*'): Promise<number> {
    return this.aggregate('count', [columns]);
  }

  /**
   * Retrieve the minimum value of a given column
   */
  async min(column: string): Promise<number> {
    return this.aggregate('min', [column]);
  }

  /**
   * Retrieve the maximum value of a given column
   */
  async max(column: string): Promise<number> {
    return this.aggregate('max', [column]);
  }

  /**
   * Retrieve the sum of the values of a given column
   */
  async sum(column: string): Promise<number> {
    return this.aggregate('sum', [column]);
  }

  /**
   * Retrieve the average of the values of a given column
   */
  async avg(column: string): Promise<number> {
    return this.aggregate('avg', [column]);
  }

  /**
   * Execute an aggregate function on the database
   */
  protected async aggregate(func: string, columns: string[] = ['*']): Promise<any> {
    const results = await this.cloneWithout(['columns'])
      .cloneWithoutBindings(['select'])
      .setAggregate(func, columns)
      .get();

    if (results.length > 0) {
      const result = Object.values(results[0])[0];
      return result ? parseFloat(String(result)) : 0;
    }

    return 0;
  }

  /**
   * Set the aggregate property without running the query
   */
  protected setAggregate(func: string, columns: string[]): this {
    this.columns = [{ function: func, columns }];
    return this;
  }

  /**
   * Create a new query builder instance
   */
  newQuery(): Builder {
    return new Builder(this.connection, this.grammar, this.processor);
  }

  /**
   * Clone the query without the given properties
   */
  protected cloneWithout(properties: string[]): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    properties.forEach((property) => {
      (clone as any)[property] = [];
    });
    return clone;
  }

  /**
   * Clone the query without the given bindings
   */
  protected cloneWithoutBindings(except: string[]): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    except.forEach((type) => {
      clone.bindings[type as keyof typeof this.bindings] = [];
    });
    return clone;
  }

  /**
   * Get the SQL representation of the query
   */
  toSql(): string {
    return this.grammar.compileSelect(this);
  }

  /**
   * Get the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get the grammar instance
   */
  getGrammar(): Grammar {
    return this.grammar;
  }

  /**
   * Get the processor instance
   */
  getProcessor(): Processor {
    return this.processor;
  }

  /**
   * Paginate the given query
   */
  async paginate(perPage: number = 15, page: number = 1): Promise<{ data: any[]; total: number; perPage: number; currentPage: number; lastPage: number }> {
    const total = await this.cloneWithout(['columns', 'orders']).count();
    const results = await this.forPage(page, perPage).get();

    return {
      data: results,
      total,
      perPage,
      currentPage: page,
      lastPage: Math.ceil(total / perPage),
    };
  }

  /**
   * Get a paginator only supporting simple next and previous links
   */
  async simplePaginate(perPage: number = 15, page: number = 1): Promise<{ data: any[]; perPage: number; currentPage: number; hasMore: boolean }> {
    const results = await this.forPage(page, perPage + 1).get();
    const hasMore = results.length > perPage;

    if (hasMore) {
      results.pop();
    }

    return {
      data: results,
      perPage,
      currentPage: page,
      hasMore,
    };
  }

  /**
   * Set the limit and offset for a given page
   */
  forPage(page: number, perPage: number = 15): this {
    return this.offset((page - 1) * perPage).limit(perPage);
  }

  /**
   * Chunk the results of the query
   */
  async chunk(count: number, callback: (results: any[], page: number) => boolean | void): Promise<boolean> {
    let page = 1;

    do {
      const results = await this.forPage(page, count).get();

      if (results.length === 0) {
        break;
      }

      if (callback(results, page) === false) {
        return false;
      }

      page++;
    } while (true);

    return true;
  }

  /**
   * Chunk the results of a query by comparing IDs
   */
  async chunkById(count: number, callback: (results: any[], lastId?: any) => boolean | void, column: string = 'id'): Promise<boolean> {
    let lastId: any = null;

    do {
      const clone = this.cloneWithout([]);
      
      if (lastId !== null) {
        clone.where(column, '>', lastId);
      }

      const results = await clone.orderBy(column).limit(count).get();

      if (results.length === 0) {
        break;
      }

      if (callback(results, lastId) === false) {
        return false;
      }

      lastId = results[results.length - 1][column];
    } while (true);

    return true;
  }

  /**
   * Execute the query and get all results lazily
   */
  async *lazy(chunkSize: number = 1000): AsyncGenerator<any> {
    let page = 1;

    while (true) {
      const results = await this.forPage(page, chunkSize).get();

      if (results.length === 0) {
        break;
      }

      for (const result of results) {
        yield result;
      }

      if (results.length < chunkSize) {
        break;
      }

      page++;
    }
  }

  /**
   * Execute the query and get all results lazily by ID
   */
  async *lazyById(chunkSize: number = 1000, column: string = 'id'): AsyncGenerator<any> {
    let lastId: any = null;

    while (true) {
      const clone = this.cloneWithout([]);
      
      if (lastId !== null) {
        clone.where(column, '>', lastId);
      }

      const results = await clone.orderBy(column).limit(chunkSize).get();

      if (results.length === 0) {
        break;
      }

      for (const result of results) {
        yield result;
      }

      lastId = results[results.length - 1][column];

      if (results.length < chunkSize) {
        break;
      }
    }
  }
}
