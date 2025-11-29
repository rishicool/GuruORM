import { Connection } from '../Connection/Connection';
import { Grammar } from './Grammars/Grammar';
import { Processor } from './Processors/Processor';
import { Expression } from './Expression';
import { JoinClause } from './JoinClause';

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
  whereNotExists(callback: (query: Builder) => void, boolean: 'and' | 'or' = 'and'): this {
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
      throw new Error(`No query results for model with ID: ${id}`);
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
  async insert(values: any[] | any): Promise<boolean> {
    if (Array.isArray(values) && values.length === 0) {
      return true;
    }

    // If values is an array and the first element is an object (not an array), treat as multiple records
    // If values is an object, wrap it in an array for single record insert
    const valuesArray = Array.isArray(values) ? values : [values];
    
    const sql = this.grammar.compileInsert(this, valuesArray);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, valuesArray);

    return this.connection.insert(sql, bindings);
  }

  /**
   * Insert a new record and get the value of the primary key
   */
  async insertGetId(values: any, sequence?: string): Promise<number> {
    const sql = this.grammar.compileInsertGetId(this, values, sequence);
    const bindings = this.grammar.prepareBindingsForInsert(this.bindings, [values]);

    const results = await this.connection.select(sql, bindings);
    
    if (results && results.length > 0) {
      const id = Object.values(results[0])[0];
      return typeof id === 'number' ? id : parseInt(String(id), 10);
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
   * Insert new records or update existing ones
   */
  async upsert(values: any[] | any, uniqueBy: string[], update?: string[]): Promise<number> {
    if (Array.isArray(values) && values.length === 0) {
      return 0;
    }

    const valuesArray = Array.isArray(values[0]) ? values : [values];
    
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
    return this.insert({ ...attributes, ...values });
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
   * Paginate the results using cursor-based pagination
   * More efficient for large datasets as it doesn't require counting total rows
   */
  async cursorPaginate(perPage: number = 15, cursor: string | null = null, cursorColumn: string = 'id'): Promise<{
    data: any[];
    perPage: number;
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  }> {
    const originalOrders = [...this.orders];
    
    // Ensure we have an order by the cursor column
    const hasOrderByCursor = this.orders.some((order: any) => order.column === cursorColumn);
    if (!hasOrderByCursor) {
      this.orderBy(cursorColumn, 'asc');
    }

    // Clone the query to get the direction
    const direction = this.orders.find((o: any) => o.column === cursorColumn)?.direction || 'asc';

    // Apply cursor condition if provided
    if (cursor) {
      const decodedCursor = this.decodeCursor(cursor);
      const operator = direction === 'asc' ? '>' : '<';
      this.where(cursorColumn, operator, decodedCursor);
    }

    // Get one more record to check if there are more pages
    const results = await this.limit(perPage + 1).get();
    const hasMore = results.length > perPage;

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (hasMore) {
      results.pop(); // Remove the extra record
    }

    if (results.length > 0) {
      const lastRecord = results[results.length - 1];
      const firstRecord = results[0];
      
      if (hasMore) {
        nextCursor = this.encodeCursor(lastRecord[cursorColumn]);
      }
      
      if (cursor) {
        prevCursor = this.encodeCursor(firstRecord[cursorColumn]);
      }
    }

    // Restore original orders
    this.orders = originalOrders;

    return {
      data: results,
      perPage,
      nextCursor,
      prevCursor,
      hasMore,
    };
  }

  /**
   * Encode a cursor value
   */
  protected encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * Decode a cursor value
   */
  protected decodeCursor(cursor: string): any {
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
