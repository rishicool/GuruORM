import { Builder } from '../Builder';
import { Expression } from '../Expression';

/**
 * Base Grammar class - inspired by Laravel's Query Grammar
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
  wrap(value: string | Expression): string {
    if (value instanceof Expression) {
      return this.getValue(value);
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
    const values = this.parameterize(where.values);
    return `${this.wrap(where.column)} in (${values})`;
  }

  /**
   * Compile a "where not in" clause
   */
  protected whereNotIn(query: Builder, where: any): string {
    const values = this.parameterize(where.values);
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
   * Compile the "order by" portions of the query
   */
  protected compileOrders(query: Builder, orders: any[]): string {
    if (orders.length === 0) {
      return '';
    }

    const compiled = orders
      .map((order) => `${this.wrap(order.column)} ${order.direction}`)
      .join(', ');

    return `order by ${compiled}`;
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
      .map((key) => `${this.wrap(key)} = ${this.parameter(values[key])}`)
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
    const updateBindings = Object.values(values);
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

    return `group by ${groups.map((group) => this.wrap(group)).join(", ")}`;
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

    if (having.type === "between") {
      return `${this.wrap(having.column)} ${having.not ? "not " : ""}between ? and ?`;
    }

    // Basic having
    const column = this.wrap(having.column);
    return `${having.boolean} ${column} ${having.operator} ?`;
  }
}
