import { Connection } from '../Connection/Connection';
import { Grammar } from './Grammars/Grammar';
import { Processor } from './Processors/Processor';
import { Expression } from './Expression';
import { JoinClause } from './JoinClause';
import { ModelNotFoundException, MultipleRecordsFoundException } from '../Errors/GuruORMError';

/**
 * Query Builder - inspired by Laravel and Illuminate
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
  protected columnAliases: Map<string, string> = new Map(); // Track column aliases
  protected returningColumns: string[] = []; // For RETURNING clause
  protected distinctFlag: boolean = false; // Track distinct queries
  
  // ON CONFLICT clause (for PostgreSQL/SQLite upsert control)
  protected conflictTarget: string[] | true | null = null;  // columns or true = no-target
  protected conflictAction: 'ignore' | 'merge' | null = null;
  protected conflictMerge: string[] | Record<string, any> | null = null; // columns or object of values

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
   * Add a subquery as a select column
   */
  selectSub(query: Builder | Function, as: string): this {
    let subQuery: Builder;

    if (typeof query === 'function') {
      subQuery = this.newQuery();
      query(subQuery);
    } else {
      subQuery = query;
    }

    const sql = `(${subQuery.toSql()}) as ${this.grammar.wrap(as)}`;
    
    this.columns.push(new Expression(sql));
    this.addBinding(subQuery.getBindings(), 'select');

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
   * Set a subquery as the from clause
   */
  fromSub(query: Builder | Function, as: string): this {
    let subQuery: Builder;

    if (typeof query === 'function') {
      subQuery = this.newQuery();
      query(subQuery);
    } else {
      subQuery = query;
    }

    const sql = `(${subQuery.toSql()})`;
    
    this.fromTable = new Expression(sql) as any;
    this.fromAlias = as;
    this.addBinding(subQuery.getBindings(), 'from');

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
   * Join a subquery to the query
   */
  joinSub(query: Builder | Function, as: string, first: string, operator?: string, second?: string, type: 'inner' | 'left' | 'right' = 'inner'): this {
    let subQuery: Builder;

    if (typeof query === 'function') {
      subQuery = this.newQuery();
      query(subQuery);
    } else {
      subQuery = query;
    }

    const expression = `(${subQuery.toSql()}) as ${this.grammar.wrap(as)}`;
    
    this.addBinding(subQuery.getBindings(), 'join');
    
    return this.join(expression as any, first, operator, second, type);
  }

  /**
   * Left join a subquery to the query
   */
  leftJoinSub(query: Builder | Function, as: string, first: string, operator?: string, second?: string): this {
    return this.joinSub(query, as, first, operator, second, 'left');
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
  where(column: string | Function | Record<string, any>, operator?: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    // Handle closure for nested where
    if (typeof column === 'function') {
      return this.whereNested(column, boolean);
    }

    // Handle plain object {col: val, col2: val2}
    if (typeof column === 'object' && column !== null && !(column instanceof Expression)) {
      for (const [k, v] of Object.entries(column as Record<string, any>)) {
        this.where(k, '=', v, boolean);
      }
      return this;
    }

    // Handle two arguments (column, value)
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    // Handle null values - convert to IS NULL or IS NOT NULL
    if (value === null) {
      if (operator === '=' || operator === '==') {
        return boolean === 'and' ? this.whereNull(column as string) : this.orWhereNull(column as string);
      } else if (operator === '!=' || operator === '<>') {
        return boolean === 'and' ? this.whereNotNull(column as string) : this.orWhereNotNull(column as string);
      }
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
  whereIn(column: string, values: any[] | Function | Builder, boolean: 'and' | 'or' = 'and', not = false): this {
    // Handle callback / closure — build a correlated subquery
    if (typeof values === 'function') {
      const sub = this.newQuery();
      (values as Function)(sub);
      return this.whereIn(column, sub, boolean, not);
    }

    // Handle empty array - should return no results (or all results if NOT IN)
    if (Array.isArray(values) && values.length === 0) {
      if (not) {
        // whereNotIn with empty array should match everything - do nothing
        return this;
      } else {
        // whereIn with empty array should match nothing - add impossible condition
        return this.whereRaw('1 = 0');
      }
    }

    const type = not ? 'NotIn' : 'In';

    this.wheres.push({
      type,
      column,
      values,
      boolean,
    });

    // If values is a Builder (subquery), add its bindings instead of the Builder object
    if (values && typeof values === 'object' && typeof (values as any).getBindings === 'function') {
      this.addBinding((values as any).getBindings(), 'where');
    } else {
      this.addBinding(values, 'where');
    }

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
   * Add an "or where not in" clause to the query
   */
  orWhereNotIn(column: string, values: any[]): this {
    return this.whereIn(column, values, 'or', true);
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
   * Add an "or where not null" clause to the query
   */
  orWhereNotNull(column: string): this {
    return this.whereNotNull(column, 'or');
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
  whereExists(callback: ((query: Builder) => void) | Builder, boolean: 'and' | 'or' = 'and', not = false): this {
    let query: Builder;
    
    // If callback is already a Builder, use it directly
    if (typeof callback === 'object' && typeof (callback as any).toSql === 'function') {
      query = callback as Builder;
    } else {
      // Otherwise, treat it as a callback function
      query = this.newQuery();
      (callback as (query: Builder) => void)(query);
    }

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
  whereNotExists(callback: ((query: Builder) => void) | Builder, boolean: 'and' | 'or' = 'and'): this {
    return this.whereExists(callback, boolean, true);
  }

  /**
   * Add an "or where exists" clause to the query
   */
  orWhereExists(callback: ((query: Builder) => void) | Builder): this {
    return this.whereExists(callback, 'or');
  }

  /**
   * Add an "or where not exists" clause to the query
   */
  orWhereNotExists(callback: (query: Builder) => void): this {
    return this.whereExists(callback, 'or', true);
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
   * Add an "or where between" clause to the query
   */
  orWhereBetween(column: string, values: [any, any]): this {
    return this.whereBetween(column, values, 'or');
  }

  /**
   * Add an "or where not between" clause to the query
   */
  orWhereNotBetween(column: string, values: [any, any]): this {
    return this.whereBetween(column, values, 'or', true);
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
   * Add a \"where date is today\" clause to the query
   */
  whereToday(column: string, boolean: 'and' | 'or' = 'and'): this {
    const today = new Date().toISOString().split('T')[0];
    return this.whereDate(column, '=', today, boolean);
  }

  /**
   * Add a \"where date is before today\" clause to the query
   */
  whereBeforeToday(column: string, boolean: 'and' | 'or' = 'and'): this {
    const today = new Date().toISOString().split('T')[0];
    return this.whereDate(column, '<', today, boolean);
  }

  /**
   * Add a \"where date is after today\" clause to the query
   */
  whereAfterToday(column: string, boolean: 'and' | 'or' = 'and'): this {
    const today = new Date().toISOString().split('T')[0];
    return this.whereDate(column, '>', today, boolean);
  }

  /**
   * Add a \"where date is today or before\" clause to the query
   */
  whereTodayOrBefore(column: string, boolean: 'and' | 'or' = 'and'): this {
    const today = new Date().toISOString().split('T')[0];
    return this.whereDate(column, '<=', today, boolean);
  }

  /**
   * Add a \"where date is today or after\" clause to the query
   */
  whereTodayOrAfter(column: string, boolean: 'and' | 'or' = 'and'): this {
    const today = new Date().toISOString().split('T')[0];
    return this.whereDate(column, '>=', today, boolean);
  }

  /**
   * Add a where day clause
   */
  whereDay(column: string, operator: string, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Day',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a where month clause
   */
  whereMonth(column: string, operator: string, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Month',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a where year clause
   */
  whereYear(column: string, operator: string, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Year',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a "where JSON contains" clause to the query
   */
  whereJsonContains(column: string, value: any, boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'JsonDoesntContain' : 'JsonContains';

    this.wheres.push({
      type,
      column,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a "where JSON doesn't contain" clause to the query
   */
  whereJsonDoesntContain(column: string, value: any, boolean: 'and' | 'or' = 'and'): this {
    return this.whereJsonContains(column, value, boolean, true);
  }

  /**
   * Add a "where JSON length" clause to the query
   */
  whereJsonLength(column: string, operator: string, value?: any, boolean: 'and' | 'or' = 'and'): this {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'JsonLength',
      column,
      operator,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add a full text search clause to the query
   */
  whereFullText(columns: string | string[], value: string, boolean: 'and' | 'or' = 'and'): this {
    const type = 'FullText';
    
    this.wheres.push({
      type,
      columns: Array.isArray(columns) ? columns : [columns],
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add an "or where full text" clause to the query
   */
  orWhereFullText(columns: string | string[], value: string): this {
    return this.whereFullText(columns, value, 'or');
  }

  /**
   * Add a "where like" clause to the query
   */
  whereLike(column: string, value: string, boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'NotLike' : 'Like';

    this.wheres.push({
      type,
      column,
      value,
      boolean,
    });

    this.addBinding(value, 'where');
    return this;
  }

  /**
   * Add an "or where like" clause to the query
   */
  orWhereLike(column: string, value: string): this {
    return this.whereLike(column, value, 'or');
  }

  /**
   * Add a "where not like" clause to the query
   */
  whereNotLike(column: string, value: string, boolean: 'and' | 'or' = 'and'): this {
    return this.whereLike(column, value, boolean, true);
  }

  /**
   * Add an "or where not like" clause to the query
   */
  orWhereNotLike(column: string, value: string): this {
    return this.whereLike(column, value, 'or', true);
  }

  /**
   * Add a where clause for any of the given columns
   */
  whereAny(columns: string[], operator: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    return this.whereNested((query: Builder) => {
      for (const column of columns) {
        query.orWhere(column, operator, value);
      }
    }, boolean);
  }

  /**
   * Add a where clause for all of the given columns
   */
  whereAll(columns: string[], operator: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    return this.whereNested((query: Builder) => {
      for (const column of columns) {
        query.where(column, operator, value);
      }
    }, boolean);
  }

  /**
   * Add a where clause that none of the given columns match
   */
  whereNone(columns: string[], operator: any, value?: any, boolean: 'and' | 'or' = 'and'): this {
    return this.whereNested((query: Builder) => {
      for (const column of columns) {
        query.where(column, '!=', value);
      }
    }, boolean);
  }

  /**
   * Add a "where not" clause to the query
   */
  whereNot(column: string | Function, operator?: any, value?: any): this {
    if (typeof column === 'function') {
      return this.whereNested(column, 'and');
    }

    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Not',
      column,
      operator,
      value,
      boolean: 'and',
    });

    if (!(value instanceof Expression)) {
      this.addBinding(value, 'where');
    }

    return this;
  }

  /**
   * Add an "or where not" clause to the query
   */
  orWhereNot(column: string | Function, operator?: any, value?: any): this {
    if (typeof column === 'function') {
      return this.whereNested(column, 'or');
    }

    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this.wheres.push({
      type: 'Not',
      column,
      operator,
      value,
      boolean: 'or',
    });

    if (!(value instanceof Expression)) {
      this.addBinding(value, 'where');
    }

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
   * Add an "or where column" clause to the query
   */
  orWhereColumn(first: string, operator: string, second?: string): this {
    return this.whereColumn(first, operator, second, 'or');
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
   * Add an "order by" clause for a timestamp to the query
   */
  latest(column: string = 'created_at'): this {
    return this.orderBy(column, 'desc');
  }

  /**
   * Add an "order by" clause for a timestamp to the query
   */
  oldest(column: string = 'created_at'): this {
    return this.orderBy(column, 'asc');
  }

  /**
   * Put the query's results in random order
   */
  inRandomOrder(seed?: string): this {
    this.orders.push({
      type: 'Random',
      seed,
    });

    return this;
  }

  /**
   * Remove all existing orders and optionally add a new order
   */
  reorder(column?: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orders = [];

    if (column) {
      return this.orderBy(column, direction);
    }

    return this;
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
   * Add a raw "group by" clause to the query
   */
  groupByRaw(sql: string, bindings: any[] = []): this {
    this.groups.push({ type: 'Raw', sql });
    this.addBinding(bindings, 'groupBy');
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

    // Resolve column alias to original expression if it exists
    const resolvedColumn = this.columnAliases.get(column) || column;

    this.havings.push({
      type: 'Basic',
      column: resolvedColumn,
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
   * Add an "or having" clause to the query
   */
  orHaving(column: string, operator?: any, value?: any): this {
    return this.having(column, operator, value, 'or');
  }

  /**
   * Add an "or having raw" clause to the query
   */
  orHavingRaw(sql: string, bindings: any[] = []): this {
    return this.havingRaw(sql, bindings, 'or');
  }

  /**
   * Add a "having between" clause to the query
   */
  havingBetween(column: string, values: [any, any], boolean: 'and' | 'or' = 'and', not = false): this {
    const type = not ? 'NotBetween' : 'Between';

    this.havings.push({
      type,
      column,
      values,
      boolean,
    });

    this.addBinding(values, 'having');
    return this;
  }

  /**
   * Add a raw select expression
   */
  selectRaw(expression: string, bindings: any[] = []): this {
    this.columns.push(new Expression(expression));
    this.addBinding(bindings, 'select');
    
    // Track alias if present (e.g., "COUNT(*) as count")
    const aliasMatch = expression.match(/\s+as\s+([a-z_][a-z0-9_]*)\s*$/i);
    if (aliasMatch) {
      const alias = aliasMatch[1];
      const originalExpression = expression.substring(0, expression.toLowerCase().lastIndexOf(' as ')).trim();
      this.columnAliases.set(alias, originalExpression);
    }
    
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
   * Add a raw "or where" clause to the query
   */
  orWhereRaw(sql: string, bindings: any[] = []): this {
    return this.whereRaw(sql, bindings, 'or');
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
    this.distinctFlag = true;
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
   * Get the current query value bindings.
   * Optimized: single-pass concat avoids Object.values() + .flat() overhead.
   */
  getBindings(): any[] {
    const b = this.bindings;
    // Hot path — most queries only use 'where' bindings
    if (b.select.length === 0 && b.from.length === 0 && b.join.length === 0 &&
        b.groupBy.length === 0 && b.having.length === 0 && b.order.length === 0 &&
        b.union.length === 0 && b.unionOrder.length === 0) {
      return b.where;
    }
    // General case — concat only non-empty arrays
    let result: any[] = [];
    if (b.select.length)     result = result.concat(b.select);
    if (b.from.length)       result = result.concat(b.from);
    if (b.join.length)       result = result.concat(b.join);
    if (b.where.length)      result = result.concat(b.where);
    if (b.groupBy.length)    result = result.concat(b.groupBy);
    if (b.having.length)     result = result.concat(b.having);
    if (b.order.length)      result = result.concat(b.order);
    if (b.union.length)      result = result.concat(b.union);
    if (b.unionOrder.length) result = result.concat(b.unionOrder);
    return result;
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
   * Execute the query and get the first result or throw an exception
   */
  async firstOrFail(columns: string[] = ['*']): Promise<any> {
    const result = await this.first(columns);
    
    if (!result) {
      throw new Error('No query results for model.');
    }

    return result;
  }

  /**
   * Execute the query and get a single result or throw an exception
   * Throws if no results or more than one result found
   */
  async sole(columns: string[] = ['*']): Promise<any> {
    const results = await this.take(2).get(columns);
    
    if (results.length === 0) {
      throw new ModelNotFoundException(this['fromTable'] || 'unknown');
    }

    if (results.length > 1) {
      throw new MultipleRecordsFoundException(2);
    }

    return results[0];
  }

  /**
   * Find a record by its primary key
   */
  async find(id: any, columns: string[] = ['*']): Promise<any> {
    return this.where('id', '=', id).first(columns);
  }

  /**
   * Find a record by its primary key or throw an exception
   */
  async findOrFail(id: any, columns: string[] = ['*']): Promise<any> {
    const result = await this.find(id, columns);
    
    if (!result) {
      throw new ModelNotFoundException(this['fromTable'] || 'unknown', [id]);
    }

    return result;
  }

  /**
   * Get a single column's value from the first result of a query
   */
  async value(column: string): Promise<any> {
    const result = await this.first([column]);
    return result ? result[column] : null;
  }

  /**
   * Get an array of a single column's values
   */
  async pluck(column: string): Promise<any[]> {
    const results = await this.get([column]);
    return results.map(row => row[column]);
  }

  /**
   * Insert new records into the database
   */
  /**
   * Set the columns to be returned from an insert/update/delete
   */
  returning(columns: string | string[]): this {
    this.returningColumns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  /**
   * Get the returning columns
   */
  getReturning(): string[] {
    return this.returningColumns;
  }

  async insert(values: any[] | any): Promise<boolean | any[]> {
    if (Array.isArray(values) && values.length === 0) {
      return true;
    }

    // If values is an array and the first element is an object (not an array), treat as multiple records
    // If values is an object, wrap it in an array for single record insert
    const valuesArray = Array.isArray(values) ? values : [values];

    // If an onConflict clause was chained, delegate to the correct compiler
    if (this.conflictAction !== null) {
      const sql = this.grammar.compileInsertOnConflict(
        this, valuesArray, this.conflictTarget, this.conflictAction, this.conflictMerge
      );
      let bindings = this.grammar.prepareBindingsForInsert(this.bindings, valuesArray);
      // If merge has a literal-values object, append those binding values after the INSERT bindings
      if (
        this.conflictAction === 'merge' &&
        this.conflictMerge !== null &&
        !Array.isArray(this.conflictMerge) &&
        typeof this.conflictMerge === 'object'
      ) {
        bindings = [...bindings, ...Object.values(this.conflictMerge as Record<string, any>)];
      }
      if (this.returningColumns.length > 0) {
        return this.connection.select(sql, bindings);
      }
      return this.connection.affectingStatement(sql, bindings) as any;
    }

    const sql = this.grammar.compileInsert(this, valuesArray);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, valuesArray);

    // If RETURNING clause is specified, use select to get results
    if (this.returningColumns.length > 0) {
      return this.connection.select(sql, bindings);
    }

    return this.connection.insert(sql, bindings);
  }

  /**
   * Specify the conflict target column(s) for ON CONFLICT handling.
   * Must be chained with .ignore() or .merge() BEFORE calling .insert().
   *
   * @example
   *   // Ignore conflicts on the 'email' unique constraint
   *   db.table('users').onConflict('email').insert({email:'x@y.com', ...})
   *
   *   // Upsert — update all non-conflict columns on conflict
   *   db.table('products').onConflict('slug').merge().insert({slug:'a', price:9})
   *
   *   // Upsert — update only listed columns on conflict
   *   db.table('products').onConflict('slug').merge(['price','stock_qty']).insert({...})
   *
   *   // Upsert with literal values object (not mirroring excluded.*)
   *   db.table('products').onConflict('slug').merge({price: 99}).insert({...})
   *
   *   // Multi-column conflict target
   *   db.table('votes').onConflict(['user_id','post_id']).merge(['count']).insert({...})
   *
   *   // No explicit target (catches any unique violation)
   *   db.table('t').onConflict().ignore().insert({...})
   */
  onConflict(columns?: string | string[]): OnConflictBuilder {
    let target: string[] | true;
    if (columns === undefined || columns === null) {
      target = true; // no explicit target → dialect decides
    } else {
      target = Array.isArray(columns) ? columns : [columns];
    }
    return new OnConflictBuilder(this, target);
  }

  /**
   * Insert a new record and get the value of the primary key
   */
  async insertGetId(values: any, sequence?: string): Promise<number | string> {
    const sql = this.grammar.compileInsertGetId(this, values, sequence);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, [values]);

    // For MySQL, use the connection's insertGetId method if available
    if (this.connection.getDriverName() === 'mysql' && typeof (this.connection as any).insertGetId === 'function') {
      return (this.connection as any).insertGetId(sql, bindings);
    }

    // For PostgreSQL and others that support RETURNING
    const results = await this.connection.select(sql, bindings);
    
    if (results && results.length > 0) {
      const id = Object.values(results[0])[0];
      // Return the actual ID value - don't force parseInt for UUIDs/strings
      return id as number | string;
    }

    return 0;
  }

  /**
   * Insert new records into the database, ignoring duplicates
   */
  async insertOrIgnore(values: any[] | any): Promise<number> {
    if (Array.isArray(values) && values.length === 0) {
      return 0;
    }

    const valuesArray = Array.isArray(values[0]) ? values : [values];
    
    const sql = this.grammar.compileInsertOrIgnore(this, valuesArray);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, valuesArray);

    return this.connection.affectingStatement(sql, bindings);
  }

  /**
   * Insert records using a subquery
   */
  async insertUsing(columns: string[], query: Builder | Function): Promise<boolean> {
    let subQuery: Builder;

    if (typeof query === 'function') {
      subQuery = this.newQuery();
      query(subQuery);
    } else {
      subQuery = query;
    }

    const sql = this.grammar.compileInsertUsing(this, columns, subQuery.toSql());
    const bindings = [...this.bindings.select, ...subQuery.getBindings()];

    return this.connection.insert(sql, bindings);
  }

  /**
   * Insert new records or update existing ones
   */
  async upsert(values: any[] | any, uniqueBy: string[], update?: string[]): Promise<number> {
    if (Array.isArray(values) && values.length === 0) {
      return 0;
    }

    // Normalise: single object → array, array of objects → use as-is
    const valuesArray: Record<string, any>[] = Array.isArray(values) ? values : [values];
    
    const sql = this.grammar.compileUpsert(this, valuesArray, uniqueBy, update);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, valuesArray);

    return this.connection.affectingStatement(sql, bindings);
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
   * Insert or update a record matching the attributes, and fill it with values
   */
  async updateOrInsert(attributes: any, values: any = {}): Promise<boolean> {
    // Build where conditions from attributes on a cloned query
    let query = this;
    for (const [key, val] of Object.entries(attributes)) {
      query = query.where(key, val);
    }

    // Try to find existing record
    const existing = await query.first();

    if (existing) {
      // Update existing record
      if (Object.keys(values).length === 0) {
        return true;
      }

      // Build new where query for update
      let updateQuery: Builder = this;
      for (const [key, val] of Object.entries(attributes)) {
        updateQuery = updateQuery.where(key, val);
      }

      return (await updateQuery.update(values)) > 0;
    }

    // Insert new record
    const insertValues = { ...attributes, ...values };
    const result = await this.insert(insertValues);
    return Array.isArray(result) ? result.length > 0 : !!result;
  }

  /**
   * Increment a column's value by a given amount
   */
  async increment(column: string, amount: number = 1, extra: any = {}): Promise<number> {
    if (amount < 0) {
      throw new Error('Increment amount must be positive.');
    }

    const wrapped = this.grammar.wrap(column);
    const columns = { ...extra, [column]: new Expression(`${wrapped} + ${amount}`) };

    return this.update(columns);
  }

  /**
   * Decrement a column's value by a given amount
   */
  async decrement(column: string, amount: number = 1, extra: any = {}): Promise<number> {
    if (amount < 0) {
      throw new Error('Decrement amount must be positive.');
    }

    const wrapped = this.grammar.wrap(column);
    const columns = { ...extra, [column]: new Expression(`${wrapped} - ${amount}`) };

    return this.update(columns);
  }

  /**
   * Increment the given column's values by the given amounts
   */
  async incrementEach(columns: Record<string, number>, extra: any = {}): Promise<number> {
    const updates: any = { ...extra };

    for (const [column, amount] of Object.entries(columns)) {
      if (amount < 0) {
        throw new Error(`Increment amount for ${column} must be positive.`);
      }

      const wrapped = this.grammar.wrap(column);
      updates[column] = new Expression(`${wrapped} + ${amount}`);
    }

    return this.update(updates);
  }

  /**
   * Decrement the given column's values by the given amounts
   */
  async decrementEach(columns: Record<string, number>, extra: any = {}): Promise<number> {
    const updates: any = { ...extra };

    for (const [column, amount] of Object.entries(columns)) {
      if (amount < 0) {
        throw new Error(`Decrement amount for ${column} must be positive.`);
      }

      const wrapped = this.grammar.wrap(column);
      updates[column] = new Expression(`${wrapped} - ${amount}`);
    }

    return this.update(updates);
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
   * Run a truncate statement on the table
   */
  async truncate(): Promise<void> {
    const sql = this.grammar.compileTruncate(this);
    await this.connection.statement(sql);
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
   * Determine if any rows exist for the current query
   */
  async exists(): Promise<boolean> {
    const results = await this.select(new Expression('1')).limit(1).get();
    return results.length > 0;
  }

  /**
   * Determine if no rows exist for the current query
   */
  async doesntExist(): Promise<boolean> {
    return !(await this.exists());
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
   * Add a shared lock to the query
   */
  sharedLock(): this {
    this.lock = 'shared';
    return this;
  }

  /**
   * Add a lock for update to the query
   */
  lockForUpdate(): this {
    this.lock = true;
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
   * Paginate the results using cursor-based pagination.
   *
   * More efficient than offset pagination for large datasets because it uses
   * a stable WHERE condition on an indexed column instead of OFFSET N.
   *
   * Supports composite cursors for tie-safe pagination:
   *   DB.table('orders').orderBy('created_at','desc').orderBy('id','desc')
   *     .cursorPaginate(25, { cursor, cursorColumns: ['created_at','id'] })
   *
   * Options:
   *   cursor        – an opaque cursor string from a previous page result
   *   cursorColumns – column(s) used for cursor comparison (default: 'id')
   *   direction     – 'next' (default) | 'prev' for backward navigation
   */
  async cursorPaginate(
    perPage: number = 15,
    options: {
      cursor?: string | null;
      cursorColumns?: string | string[];
      direction?: 'next' | 'prev';
    } = {},
  ): Promise<{
    data: any[];
    perPage: number;
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const { cursor = null, cursorColumns = 'id', direction = 'next' } = options;
    const isPrev = direction === 'prev';

    // Normalise cursor columns to array
    const cols: string[] = Array.isArray(cursorColumns) ? cursorColumns : [cursorColumns];

    // Work on a CLONE so this builder is never mutated
    const q = this.clone();

    // Ensure each cursor column has an ORDER BY on the clone
    for (const col of cols) {
      const already = (q as any).orders.some((o: any) => o.column === col);
      if (!already) q.orderBy(col, 'asc');
    }

    // Capture the intended (forward) sort directions for each cursor column
    const directions: string[] = cols.map(
      col => (q as any).orders.find((o: any) => o.column === col)?.direction ?? 'asc',
    );

    // For backward navigation, flip every ORDER BY direction on the clone
    if (isPrev) {
      (q as any).orders = (q as any).orders.map((o: any) => ({
        ...o,
        direction: o.direction === 'asc' ? 'desc' : 'asc',
      }));
    }

    // Apply cursor WHERE condition using the original (forward) directions
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      // For forward (>) or backward (<) comparison
      const getOp = (dir: string) => {
        if (!isPrev) return dir === 'asc' ? '>' : '<';
        return dir === 'asc' ? '<' : '>';
      };

      if (cols.length === 1) {
        q.where(cols[0], getOp(directions[0]), decoded[cols[0]]);
      } else {
        // OR-expansion: (c1>v1) OR (c1=v1 AND c2>v2) OR …
        q.where((sub: Builder) => {
          for (let i = 0; i < cols.length; i++) {
            sub.orWhere((inner: Builder) => {
              for (let j = 0; j < i; j++) inner.where(cols[j], '=', decoded[cols[j]]);
              inner.where(cols[i], getOp(directions[i]), decoded[cols[i]]);
            });
          }
        });
      }
    }

    // Fetch one extra to detect whether more pages exist in this direction
    const results = await q.limit(perPage + 1).get();
    const hasMoreInDirection = results.length > perPage;
    if (hasMoreInDirection) results.pop();

    // For backward navigation, reverse so results are in the natural forward order
    if (isPrev) results.reverse();

    // Build cursor tokens
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (results.length > 0) {
      const first = results[0];
      const last  = results[results.length - 1];

      if (!isPrev) {
        if (hasMoreInDirection) {
          nextCursor = this.encodeCursor(Object.fromEntries(cols.map(c => [c, last[c]])));
        }
        prevCursor = cursor
          ? this.encodeCursor(Object.fromEntries(cols.map(c => [c, first[c]])))
          : null;
      } else {
        // Backward: the "next" token points at the last row (for forward nav),
        // the "prev" token points at the first row (to keep going backward)
        nextCursor = this.encodeCursor(Object.fromEntries(cols.map(c => [c, last[c]])));
        prevCursor = hasMoreInDirection
          ? this.encodeCursor(Object.fromEntries(cols.map(c => [c, first[c]])))
          : null;
      }
    }

    const hasPrev = !isPrev ? cursor !== null && cursor !== undefined && cursor !== '' : hasMoreInDirection;
    const hasNext = !isPrev ? hasMoreInDirection : nextCursor !== null;

    return {
      data: results,
      perPage,
      nextCursor,
      prevCursor,
      hasMore: hasMoreInDirection,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Encode a cursor value to a URL-safe base64 string.
   */
  protected encodeCursor(value: Record<string, any>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * Decode a base64 cursor string back to its key/value map.
   */
  protected decodeCursor(cursor: string): Record<string, any> {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
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
  async chunk(count: number, callback: (results: any[], page: number) => boolean | void | Promise<boolean | void>): Promise<boolean> {
    let page = 1;

    do {
      const results = await this.forPage(page, count).get();

      if (results.length === 0) {
        break;
      }

      if (await callback(results, page) === false) {
        return false;
      }

      page++;
    } while (true);

    return true;
  }

  /**
   * Chunk the results of a query by comparing IDs
   */
  async chunkById(count: number, callback: (results: any[], lastId?: any) => boolean | void | Promise<boolean | void>, column: string = 'id'): Promise<boolean> {
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

      if (await callback(results, lastId) === false) {
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

  /**
   * Apply the callback if the given "value" is (or resolves to) truthy
   */
  when(value: any, callback: (query: this, value: any) => void, defaultCallback?: (query: this, value: any) => void): this {
    const condition = typeof value === 'function' ? value() : value;

    if (condition) {
      callback(this, condition);
    } else if (defaultCallback) {
      defaultCallback(this, condition);
    }

    return this;
  }

  /**
   * Apply the callback if the given "value" is (or resolves to) falsy
   */
  unless(value: any, callback: (query: this, value: any) => void, defaultCallback?: (query: this, value: any) => void): this {
    const condition = typeof value === 'function' ? value() : value;

    if (!condition) {
      callback(this, condition);
    } else if (defaultCallback) {
      defaultCallback(this, condition);
    }

    return this;
  }

  /**
   * Dump the SQL and bindings
   */
  dump(): this {
    console.log('SQL:', this.toSql());
    console.log('Bindings:', this.getBindings());
    return this;
  }

  /**
   * Dump the SQL and bindings and die
   */
  dd(): never {
    this.dump();
    process.exit(1);
  }

  /**
   * Dump the raw SQL with bindings interpolated
   */
  dumpRawSql(): this {
    console.log('Raw SQL:', this.toRawSql());
    return this;
  }

  /**
   * Dump the raw SQL with bindings and die
   */
  ddRawSql(): never {
    this.dumpRawSql();
    process.exit(1);
  }

  /**
   * Get the raw SQL with bindings interpolated
   */
  toRawSql(): string {
    let sql = this.toSql();
    const bindings = this.getBindings();
    
    for (const binding of bindings) {
      const value = typeof binding === 'string' ? `'${binding}'` : binding;
      sql = sql.replace('?', String(value));
    }
    
    return sql;
  }

  /**
   * Explain the query
   */
  async explain(): Promise<any[]> {
    const sql = this.toSql();
    const bindings = this.getBindings();
    
    return this.connection.select(`EXPLAIN ${sql}`, bindings);
  }

  /**
   * Cursor-based iteration through query results
   */
  async *cursor(): AsyncGenerator<any> {
    const sql = this.toSql();
    const bindings = this.getBindings();
    
    const results = await this.connection.select(sql, bindings);
    
    for (const result of results) {
      yield result;
    }
  }

  /**
   * Clone the query builder
   */
  clone(): Builder {
    const cloned = new Builder(this.connection, this.grammar, this.processor);
    
    // Copy all query components
    cloned.columns = [...this.columns];
    cloned.fromTable = this.fromTable;
    cloned.fromAlias = this.fromAlias;
    cloned.joins = [...this.joins];
    cloned.wheres = [...this.wheres];
    cloned.groups = [...this.groups];
    cloned.havings = [...this.havings];
    cloned.orders = [...this.orders];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.unions = [...this.unions];
    cloned.lock = this.lock;
    
    // Copy bindings
    cloned.bindings = {
      select: [...this.bindings.select],
      from: [...this.bindings.from],
      join: [...this.bindings.join],
      where: [...this.bindings.where],
      groupBy: [...this.bindings.groupBy],
      having: [...this.bindings.having],
      order: [...this.bindings.order],
      union: [...this.bindings.union],
      unionOrder: [...this.bindings.unionOrder],
    };
    
    return cloned;
  }
}

/**
 * Fluent sub-builder for ON CONFLICT clauses.
 * Returned by `Builder.onConflict()` — call `.ignore()` or `.merge()` to finalise.
 */
export class OnConflictBuilder {
  constructor(
    private readonly builder: Builder,
    private readonly target: string[] | true,
  ) {}

  /**
   * ON CONFLICT ... DO NOTHING
   */
  ignore(): Builder {
    (this.builder as any).conflictTarget = this.target;
    (this.builder as any).conflictAction = 'ignore';
    (this.builder as any).conflictMerge = null;
    return this.builder;
  }

  /**
   * ON CONFLICT ... DO UPDATE SET ...
   *
   * @param updates  - undefined  → mirror all inserted columns (excluded.*)
   *                 - string[]  → mirror only these columns (excluded.*)
   *                 - object    → set literal values { col: value, ... }
   */
  merge(updates?: string[] | Record<string, any>): Builder {
    (this.builder as any).conflictTarget = this.target;
    (this.builder as any).conflictAction = 'merge';
    (this.builder as any).conflictMerge = updates ?? null;
    return this.builder;
  }

  // Guard: calling .then() without .ignore()/.merge() throws a helpful error
  then(): never {
    throw new Error(
      'Incomplete onConflict clause. .onConflict() must be followed by .ignore() or .merge() before .insert()'
    );
  }
}
