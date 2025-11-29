import { Builder } from '../Builder';
import { Expression } from '../Expression';

/**
 * Base Grammar class - inspired by Laravel and Illuminate
 * Compiles query builder into SQL statements
 */
export class Grammar {
  protected tablePrefix = '';

  /**
   * The grammar table prefix
   */
  setTablePrefix(prefix: string): void {
    this.tablePrefix = prefix;
  }

  /**
   * Get the grammar table prefix
   */
  getTablePrefix(): string {
    return this.tablePrefix;
  }

  /**
   * Wrap a table in keyword identifiers
   */
  wrapTable(table: string | Expression): string {
    if (table instanceof Expression) {
      return this.getValue(table);
    }

    return this.wrap(this.tablePrefix + table);
  }

  /**
   * Wrap a value in keyword identifiers
   */
  wrap(value: string | Expression | any): string {
    if (value instanceof Expression) {
      return this.getValue(value);
    }

    // Handle non-string values - convert to string
    if (typeof value !== 'string') {
      value = String(value);
    }

    if (value.toLowerCase().includes(' as ')) {
      return this.wrapAliasedValue(value);
    }

    return this.wrapSegments(value.split('.'));
  }

  /**
   * Wrap a value that has an alias
   */
  protected wrapAliasedValue(value: string): string {
    const segments = value.split(/\s+as\s+/i);
    return `${this.wrap(segments[0])} as ${this.wrapValue(segments[1])}`;
  }

  /**
   * Wrap the given value segments
   */
  protected wrapSegments(segments: string[]): string {
    return segments.map((segment) => this.wrapValue(segment)).join("." );
  }

  /**
   * Wrap a single string in keyword identifiers
   */
  protected wrapValue(value: string): string {
    if (value === '*') {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Get the value of a raw expression
   */
  getValue(expression: Expression): string {
    return expression.getValue();
  }

  /**
   * Convert an array of column names into a delimited string
   */
  columnize(columns: string[]): string {
    return columns.map((column) => this.wrap(column)).join(', ');
  }

  /**
   * Create query parameter place-holders for an array
   */
  parameterize(values: any[]): string {
    return values.map(() => this.parameter()).join(', ');
  }

  /**
   * Get the appropriate query parameter place-holder for a value
   */
  parameter(value?: any): string {
    return '?';
  }

  /**
   * Compile a select query into SQL
   */
  compileSelect(query: Builder): string {
    if (query["columns"].length === 0) {
      query["columns"] = ["*"];
    }

    // If we have unions, we need to wrap the query
    if (query["unions"] && query["unions"].length > 0) {
      return this.compileUnionAggregate(query);
    }

    const sql: string[] = [];

    // Component to property mapping
    const componentMap: { [key: string]: string } = {
      columns: "columns",
      from: "fromTable",
      joins: "joins",
      wheres: "wheres",
      groups: "groups",
      havings: "havings",
      orders: "orders",
      limit: "limitValue",
      offset: "offsetValue",
      lock: "lock",
    };

    // Compile each component of the query
    const components = Object.keys(componentMap);

    components.forEach((component) => {
      const propertyName = componentMap[component];
      const method = `compile${component.charAt(0).toUpperCase() + component.slice(1)}`;
      
      if (typeof (this as any)[method] === "function") {
        const value = query[propertyName as keyof Builder];
        const compiled = (this as any)[method](query, value);
        if (compiled) {
          sql.push(compiled);
        }
      }
    });

    return sql.join(" ");
  }

  /**
   * Compile a union aggregate query
   */
  protected compileUnionAggregate(query: Builder): string {
    const sql = this.compileUnions(query);

    if (query['orders'] && query['orders'].length > 0) {
      return `${sql} ${this.compileOrders(query, query['orders'])}`;
    }

    return sql;
  }

  /**
   * Compile the union statements into SQL
   */
  protected compileUnions(query: Builder): string {
    let sql = this.compileSelectWithoutUnions(query);

    query['unions'].forEach((union: any) => {
      const keyword = union.all ? 'union all' : 'union';
      const unionQuery = union.query;
      sql += ` ${keyword} ${this.compileSelectWithoutUnions(unionQuery)}`;
    });

    return sql;
  }

  /**
   * Compile a select query without unions
   */
  protected compileSelectWithoutUnions(query: Builder): string {
    const originalUnions = query['unions'];
    query['unions'] = [];
    
    const sql = this.compileSelect(query);
    
    query['unions'] = originalUnions;
    return sql;
  }

  /**
   * Compile the "select *" portion of the query
   */
  protected compileColumns(query: Builder, columns: any[]): string {
    if (columns.length > 0 && typeof columns[0] === 'object' && 'function' in columns[0]) {
      return this.compileAggregate(query, columns[0]);
    }

    const select = columns.includes('*') ? '*' : this.columnize(columns);
    return `select ${select}`;
  }

  /**
   * Compile an aggregated select clause
   */
  protected compileAggregate(query: Builder, aggregate: any): string {
    const column = this.columnize(aggregate.columns);
    return `select ${aggregate.function}(${column}) as aggregate`;
  }

  /**
   * Compile the "from" portion of the query
   */
  protected compileFrom(query: Builder): string {
    const table = query["fromTable"];
    if (!table) {
      return "";
    }
    
    const wrappedTable = this.wrapTable(table);
    const alias = query["fromAlias"] ? ` as ${this.wrap(query["fromAlias"])}` : "";
    return `from ${wrappedTable}${alias}`;
  }

  /**
   * Compile the "join" portions of the query
   */
  protected compileJoins(query: Builder, joins: any[]): string {
    if (joins.length === 0) {
      return '';
    }

    return joins
      .map((join) => {
        if (join.type === 'cross') {
          return `cross join ${this.wrapTable(join.table)}`;
        }

        const table = this.wrapTable(join.table);
        const clauses = this.compileJoinConstraints(join);
        const type = join.type === 'inner' ? 'inner' : join.type;

        return `${type} join ${table} on ${clauses}`;
      })
      .join(' ');
  }

  /**
   * Compile the "on" clauses for a join
   */
  protected compileJoinConstraints(join: any): string {
    const wheres = join.wheres || [];
    
    if (wheres.length === 0) {
      return '';
    }

    return wheres
      .map((where: any, index: number) => {
        const boolean = index === 0 ? '' : where.boolean;
        const connector = boolean ? ` ${boolean} ` : '';

        if (where.type === 'Column') {
          return `${connector}${this.wrap(where.first)} ${where.operator} ${this.wrap(where.second)}`;
        }

        if (where.type === 'Nested') {
          const nested = this.compileJoinConstraints(where.query);
          return `${connector}(${nested})`;
        }

        if (where.type === 'Basic') {
          const value = this.parameter(where.value);
          return `${connector}${this.wrap(where.column)} ${where.operator} ${value}`;
        }

        return '';
      })
      .join('');
  }

  /**
   * Compile the "where" portions of the query
   */
  protected compileWheres(query: Builder, wheres: any[]): string {
    if (wheres.length === 0) {
      return '';
    }

    const sql = wheres.map((where, index) => {
      const boolean = index === 0 ? 'where' : where.boolean;
      const method = `where${where.type}`;

      if (typeof (this as any)[method] === 'function') {
        return `${boolean} ${(this as any)[method](query, where)}`;
      }

      return '';
    });

    return sql.join(' ');
  }

  /**
   * Compile a basic where clause
   */
  protected whereBasic(query: Builder, where: any): string {
    const value = this.parameter(where.value);
    return `${this.wrap(where.column)} ${where.operator} ${value}`;
  }

  /**
   * Compile a nested where clause
   */
  protected whereNested(query: Builder, where: any): string {
    const nested = where.query;
    return `(${this.compileWheres(nested, nested['wheres']).substring(6)})`;
  }

  /**
   * Compile a "where in" clause
   */
  protected whereIn(query: Builder, where: any): string {
    // Check if values is a subquery (Builder instance)
    if (where.values && typeof where.values === 'object' && typeof where.values.toSql === 'function') {
      return this.whereInSub(query, where);
    }
    // Ensure values is always an array
    const valuesArray = Array.isArray(where.values) ? where.values : [where.values];
    const values = this.parameterize(valuesArray);
    return `${this.wrap(where.column)} in (${values})`;
  }

  /**
   * Compile a "where not in" clause
   */
  protected whereNotIn(query: Builder, where: any): string {
    // Check if values is a subquery (Builder instance)
    if (where.values && typeof where.values === 'object' && typeof where.values.toSql === 'function') {
      return this.whereInSub(query, where);
    }
    // Ensure values is always an array
    const valuesArray = Array.isArray(where.values) ? where.values : [where.values];
    const values = this.parameterize(valuesArray);
    return `${this.wrap(where.column)} not in (${values})`;
  }

  /**
   * Compile a "where null" clause
   */
  protected whereNull(query: Builder, where: any): string {
    return `${this.wrap(where.column)} is null`;
  }

  /**
   * Compile a "where not null" clause
   */
  protected whereNotNull(query: Builder, where: any): string {
    return `${this.wrap(where.column)} is not null`;
  }

  /**
   * Compile a "where between" clause
   */
  protected whereBetween(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    return `${column} between ? and ?`;
  }

  /**
   * Compile a "where not between" clause
   */
  protected whereNotBetween(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    return `${column} not between ? and ?`;
  }

  /**
   * Compile a "where in" subquery clause
   */
  protected whereInSub(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const subquery = where.values.toSql();
    return `${column} in (${subquery})`;
  }

  /**
   * Compile a "where not in" subquery clause
   */
  protected whereNotInSub(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const subquery = where.values.toSql();
    return `${column} not in (${subquery})`;
  }

  /**
   * Compile a "where exists" clause
   */
  protected whereExists(query: Builder, where: any): string {
    const subquery = where.query.toSql();
    return `exists (${subquery})`;
  }

  /**
   * Compile a "where not exists" clause
   */
  protected whereNotExists(query: Builder, where: any): string {
    const subquery = where.query.toSql();
    return `not exists (${subquery})`;
  }

  /**
   * Compile a raw where clause
   */
  protected whereRaw(query: Builder, where: any): string {
    return where.sql;
  }

  /**
   * Compile a "where column" clause
   */
  protected whereColumn(query: Builder, where: any): string {
    return `${this.wrap(where.first)} ${where.operator} ${this.wrap(where.second)}`;
  }

  /**
   * Compile a "where date" clause
   */
  protected whereDate(query: Builder, where: any): string {
    return `date(${this.wrap(where.column)}) ${where.operator} ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where time" clause
   */
  protected whereTime(query: Builder, where: any): string {
    return `time(${this.wrap(where.column)}) ${where.operator} ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where day" clause
   */
  protected whereDay(query: Builder, where: any): string {
    return `day(${this.wrap(where.column)}) ${where.operator} ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where month" clause
   */
  protected whereMonth(query: Builder, where: any): string {
    return `month(${this.wrap(where.column)}) ${where.operator} ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where year" clause
   */
  protected whereYear(query: Builder, where: any): string {
    return `year(${this.wrap(where.column)}) ${where.operator} ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where JSON contains" clause
   */
  protected whereJsonContains(query: Builder, where: any): string {
    return `json_contains(${this.wrap(where.column)}, ${this.parameter(where.value)})`;
  }

  /**
   * Compile a "where JSON doesn't contain" clause
   */
  protected whereJsonDoesntContain(query: Builder, where: any): string {
    return `not json_contains(${this.wrap(where.column)}, ${this.parameter(where.value)})`;
  }

  /**
   * Compile a "where JSON length" clause
   */
  protected whereJsonLength(query: Builder, where: any): string {
    return `json_length(${this.wrap(where.column)}) ${where.operator} ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where full text" clause
   */
  protected whereFullText(query: Builder, where: any): string {
    const columns = where.columns.map((col: string) => this.wrap(col)).join(', ');
    return `match(${columns}) against(${this.parameter(where.value)})`;
  }

  /**
   * Compile a "where not" clause
   */
  protected whereNot(query: Builder, where: any): string {
    const value = this.parameter(where.value);
    return `not ${this.wrap(where.column)} ${where.operator} ${value}`;
  }

  /**
   * Compile a "where like" clause
   */
  protected whereLike(query: Builder, where: any): string {
    return `${this.wrap(where.column)} like ${this.parameter(where.value)}`;
  }

  /**
   * Compile a "where not like" clause
   */
  protected whereNotLike(query: Builder, where: any): string {
    return `${this.wrap(where.column)} not like ${this.parameter(where.value)}`;
  }

  /**
   * Compile the "order by" portions of the query
   */
  protected compileOrders(query: Builder, orders: any[]): string {
    if (orders.length === 0) {
      return '';
    }

    const compiled = orders
      .map((order) => {
        if (order.type === 'Random') {
          return this.compileRandom(order.seed);
        }
        if (order.type === 'Raw') {
          return order.sql;
        }
        return `${this.wrap(order.column)} ${order.direction}`;
      })
      .join(', ');

    return `order by ${compiled}`;
  }

  /**
   * Compile the random statement into SQL
   */
  protected compileRandom(seed?: string): string {
    return 'RANDOM()';
  }

  /**
   * Compile the "limit" portions of the query
   */
  protected compileLimit(query: Builder, limit: number | null): string {
    if (limit === null) {
      return '';
    }

    return `limit ${limit}`;
  }

  /**
   * Compile the "offset" portions of the query
   */
  protected compileOffset(query: Builder, offset: number | null): string {
    if (offset === null || offset === 0) {
      return '';
    }

    return `offset ${offset}`;
  }

  /**
   * Compile an insert statement into SQL
   */
  compileInsert(query: Builder, values: any[]): string {
    const table = this.wrapTable(query['fromTable'] || '');
    
    if (values.length === 0) {
      return '';
    }

    const columns = this.columnize(Object.keys(values[0]));
    const parameters = values
      .map((record) => `(${this.parameterize(Object.values(record))})`)
      .join(', ');

    return `insert into ${table} (${columns}) values ${parameters}`;
  }

  /**
   * Compile an update statement into SQL
   */
  compileUpdate(query: Builder, values: any): string {
    const table = this.wrapTable(query['fromTable'] || '');
    
    const columns = Object.keys(values)
      .map((key) => {
        const value = values[key];
        // If value is an Expression, use its value directly
        if (value instanceof Expression) {
          return `${this.wrap(key)} = ${value.getValue()}`;
        }
        return `${this.wrap(key)} = ${this.parameter(value)}`;
      })
      .join(', ');

    const where = this.compileWheres(query, query['wheres']);

    return `update ${table} set ${columns} ${where}`.trim();
  }

  /**
   * Compile a delete statement into SQL
   */
  compileDelete(query: Builder): string {
    const table = this.wrapTable(query['fromTable'] || '');
    const where = this.compileWheres(query, query['wheres']);

    return `delete from ${table} ${where}`.trim();
  }

  /**
   * Prepare the bindings for an insert statement
   */
  prepareBindingsForInsert(bindings: any, values: any[]): any[] {
    return values.flatMap((record) => Object.values(record));
  }

  /**
   * Prepare the bindings for an update statement
   */
  prepareBindingsForUpdate(bindings: any, values: any): any[] {
    // Filter out Expression values from bindings since they're used directly in SQL
    const updateBindings = Object.values(values).filter(v => !(v instanceof Expression));
    const whereBindings = bindings.where || [];
    return [...updateBindings, ...whereBindings];
  }

  /**
   * Compile the "group by" portions of the query
   */
  protected compileGroups(query: Builder, groups: any[]): string {
    if (!groups || groups.length === 0) {
      return "";
    }

    const compiled = groups.map((group) => {
      if (typeof group === 'object' && group.type === 'Raw') {
        return group.sql;
      }
      return this.wrap(group);
    }).join(", ");

    return `group by ${compiled}`;
  }

  /**
   * Compile the "having" portions of the query
   */
  protected compileHavings(query: Builder, havings: any[]): string {
    if (!havings || havings.length === 0) {
      return "";
    }

    const sql = havings.map((having, index) => {
      // Remove boolean from first having clause
      const compiled = this.compileHaving(having);
      if (index === 0) {
        return compiled.replace(/^(and |or )/i, "");
      }
      return compiled;
    }).join(" ");
    
    return `having ${sql}`;
  }

  /**
   * Compile a single having clause
   */
  protected compileHaving(having: any): string {
    if (having.type === "Raw") {
      return having.sql;
    }

    if (having.type === "Between" || having.type === "NotBetween") {
      const not = having.type === "NotBetween" ? "not " : "";
      return `${having.boolean} ${this.wrap(having.column)} ${not}between ? and ?`;
    }

    // Basic having - check if column looks like a function call (contains parentheses)
    // If so, don't wrap it (it's already a raw expression like COUNT(*))
    const column = having.column.includes('(') ? having.column : this.wrap(having.column);
    return `${having.boolean} ${column} ${having.operator} ?`;
  }

  /**
   * Compile an insert and get ID statement into SQL
   */
  compileInsertGetId(query: Builder, values: any, sequence?: string): string {
    return this.compileInsert(query, [values]) + ' returning id';
  }

  /**
   * Compile an insert ignore statement into SQL
   */
  compileInsertOrIgnore(query: Builder, values: any[]): string {
    return this.compileInsert(query, values).replace('insert', 'insert or ignore');
  }

  /**
   * Compile an upsert statement into SQL
   */
  compileUpsert(query: Builder, values: any[], uniqueBy: string[], update?: string[]): string {
    const insert = this.compileInsert(query, values);
    const columns = update || Object.keys(values[0]).filter(k => !uniqueBy.includes(k));
    const updateClause = columns.map(col => `${this.wrap(col)} = excluded.${this.wrap(col)}`).join(', ');
    const uniqueColumns = uniqueBy.map(col => this.wrap(col)).join(', ');

    return `${insert} on conflict (${uniqueColumns}) do update set ${updateClause}`;
  }

  /**
   * Compile a truncate table statement into SQL
   */
  compileTruncate(query: Builder): string {
    const table = this.wrapTable(query['fromTable'] || '');
    return `truncate table ${table}`;
  }

  /**
   * Compile the lock into SQL
   */
  protected compileLock(query: Builder, value: boolean | string): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value === 'shared' ? 'for share' : 'for update';
    }

    return 'for update';
  }
}
