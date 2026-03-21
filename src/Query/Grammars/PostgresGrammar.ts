import { Grammar } from './Grammar';
import { Builder } from '../Builder';

/**
 * PostgreSQL Query Grammar
 */
export class PostgresGrammar extends Grammar {
  /**
   * Get the appropriate query parameter place-holder for a value
   * PostgreSQL uses $1, $2, $3 instead of ?
   */
  protected parameterCounter = 0;

  parameter(value?: any): string {
    return `$${++this.parameterCounter}`;
  }

  /**
   * Compile a "where between" clause
   */
  protected whereBetween(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const min = this.parameter(where.values[0]);
    const max = this.parameter(where.values[1]);
    return `${column} between ${min} and ${max}`;
  }

  /**
   * Compile a "where not between" clause
   */
  protected whereNotBetween(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const min = this.parameter(where.values[0]);
    const max = this.parameter(where.values[1]);
    return `${column} not between ${min} and ${max}`;
  }

  /**
   * Compile a single having clause
   */
  protected compileHaving(having: any): string {
    if (having.type === "Raw") {
      // Replace ? placeholders with $N for PostgreSQL
      let sql = having.sql;
      const matches = sql.match(/\?/g);
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          sql = sql.replace('?', this.parameter());
        }
      }
      return sql;
    }

    if (having.type === "Between" || having.type === "NotBetween") {
      const not = having.type === "NotBetween" ? "not " : "";
      const min = this.parameter(having.values[0]);
      const max = this.parameter(having.values[1]);
      return `${having.boolean} ${this.wrap(having.column)} ${not}between ${min} and ${max}`;
    }

    // Basic having clause - check if column looks like a function call (contains parentheses)
    // If so, don't wrap it (it's already a raw expression like COUNT(*))
    const column = having.column.includes('(') ? having.column : this.wrap(having.column);
    const value = this.parameter(having.value);
    return `${having.boolean} ${column} ${having.operator} ${value}`;
  }

  /**
   * Compile a "where raw" clause for PostgreSQL
   */
  protected whereRaw(query: Builder, where: any): string {
    // Replace ? placeholders with $N for PostgreSQL
    let sql = where.sql;
    const matches = sql.match(/\?/g);
    if (matches) {
      for (let i = 0; i < matches.length; i++) {
        sql = sql.replace('?', this.parameter());
      }
    }
    return sql;
  }

  /**
   * Compile a basic where clause for PostgreSQL
   * Handles LIKE/ILIKE operators by casting to TEXT to support UUID and other non-text types
   */
  protected whereBasic(query: Builder, where: any): string {
    const operator = where.operator.toUpperCase();
    
    // For LIKE/ILIKE operators, cast both column and value to TEXT to handle UUID/numeric types
    if (operator === 'LIKE' || operator === 'ILIKE' || operator === 'NOT LIKE' || operator === 'NOT ILIKE') {
      // Only cast the column (no parameter), and cast the parameter placeholder
      const column = `CAST(${this.wrap(where.column)} AS TEXT)`;
      const parameter = this.parameter(where.value);
      const value = `CAST(${parameter} AS TEXT)`;
      return `${column} ${where.operator} ${value}`;
    }
    
    // For other operators, use standard compilation
    const value = this.parameter(where.value);
    return `${this.wrap(where.column)} ${where.operator} ${value}`;
  }

  /**
   * Compile a "where like" clause for PostgreSQL
   */
  protected whereLike(query: Builder, where: any): string {
    // Cast the column to text and use CAST for the parameter
    return `CAST(${this.wrap(where.column)} AS TEXT) like CAST(${this.parameter(where.value)} AS TEXT)`;
  }

  /**
   * Compile a "where not like" clause for PostgreSQL
   */
  protected whereNotLike(query: Builder, where: any): string {
    // Cast the column to text and use CAST for the parameter
    return `CAST(${this.wrap(where.column)} AS TEXT) not like CAST(${this.parameter(where.value)} AS TEXT)`;
  }

  /**
   * Compile a "where exists" clause for PostgreSQL
   * Renumber subquery parameters to continue from parent's counter
   */
  protected whereExists(query: Builder, where: any): string {
    // Save current counter before subquery compilation resets it
    const offset = this.parameterCounter;
    
    // Get the subquery SQL (this resets the counter internally)
    const subquery = where.query.toSql();
    
    // Restore and update counter after subquery compilation
    this.parameterCounter = offset;
    
    // Renumber the subquery's parameters to continue from current counter
    // The subquery used $1, $2, $3... but we need to offset them
    let renumbered = subquery;
    
    // Count how many parameters are in the subquery
    const paramMatches = subquery.match(/\$\d+/g);
    if (paramMatches) {
      // Replace parameters in reverse order to avoid replacing $1 in $10
      const uniqueParams = [...new Set(paramMatches)].sort((a: any, b: any) => {
        const numA = parseInt((a as string).substring(1));
        const numB = parseInt((b as string).substring(1));
        return numB - numA; // Descending order
      });
      
      for (const param of uniqueParams) {
        const oldNum = parseInt((param as string).substring(1));
        const newNum = oldNum + offset;
        const regex = new RegExp('\\$' + oldNum + '(?!\\d)', 'g');
        renumbered = renumbered.replace(regex, `$${newNum}`);
      }
      
      // Update counter to account for subquery parameters
      this.parameterCounter = offset + uniqueParams.length;
    }
    
    return `exists (${renumbered})`;
  }

  /**
   * Compile a "where not exists" clause for PostgreSQL
   * Renumber subquery parameters to continue from parent's counter
   */
  protected whereNotExists(query: Builder, where: any): string {
    // Save current counter before subquery compilation resets it
    const offset = this.parameterCounter;
    
    // Get the subquery SQL (this resets the counter internally)
    const subquery = where.query.toSql();
    
    // Restore and update counter after subquery compilation
    this.parameterCounter = offset;
    
    // Renumber the subquery's parameters to continue from current counter
    let renumbered = subquery;
    
    // Count how many parameters are in the subquery
    const paramMatches = subquery.match(/\$\d+/g);
    if (paramMatches) {
      // Replace parameters in reverse order to avoid replacing $1 in $10
      const uniqueParams = [...new Set(paramMatches)].sort((a: any, b: any) => {
        const numA = parseInt((a as string).substring(1));
        const numB = parseInt((b as string).substring(1));
        return numB - numA; // Descending order
      });
      
      for (const param of uniqueParams) {
        const oldNum = parseInt((param as string).substring(1));
        const newNum = oldNum + offset;
        const regex = new RegExp('\\$' + oldNum + '(?!\\d)', 'g');
        renumbered = renumbered.replace(regex, `$${newNum}`);
      }
      
      // Update counter to account for subquery parameters
      this.parameterCounter = offset + uniqueParams.length;
    }
    
    return `not exists (${renumbered})`;
  }

  /**
   * Compile an insert and get ID statement for PostgreSQL
   */
  compileInsertGetId(query: any, values: any, sequence?: string): string {
    const insert = this.compileInsert(query, [values]);
    return `${insert} returning ${this.wrap(sequence || 'id')}`;
  }

  /**
   * Compile an "insert or ignore" statement for PostgreSQL.
   * Uses ON CONFLICT DO NOTHING.
   */
  compileInsertOrIgnore(query: any, values: any[]): string {
    return `${this.compileInsert(query, values)} on conflict do nothing`;
  }

  /**
   * Compile an upsert statement for PostgreSQL.
   * Uses ON CONFLICT (...) DO UPDATE SET ... = excluded....
   * Resets parameter counter so $N placeholders are correct.
   */
  compileUpsert(query: any, values: any[], uniqueBy: string[], update?: string[]): string {
    this.parameterCounter = 0;
    return super.compileUpsert(query, values, uniqueBy, update);
  }

  /**
   * Compile INSERT with ON CONFLICT for PostgreSQL (fluent onConflict() API).
   * Also handles literal values object for merge: { col: value }.
   */
  compileInsertOnConflict(
    query: any,
    values: any[],
    target: string[] | true | null,
    action: 'ignore' | 'merge',
    mergeUpdates: string[] | Record<string, any> | null,
  ): string {
    this.parameterCounter = 0;
    // Bare insert (no RETURNING) so we can append ON CONFLICT before RETURNING
    const insert = this.compileInsertBase(query, values);

    const targetClause = (target === true || target === null || (Array.isArray(target) && target.length === 0))
      ? ''
      : ` (${(target as string[]).map(c => this.wrap(c)).join(', ')})`;

    let sql: string;

    if (action === 'ignore') {
      sql = `${insert} on conflict${targetClause} do nothing`;
    } else {
      // action === 'merge': literal values object binds the values themselves
      let setClauses: string;
      if (mergeUpdates && !Array.isArray(mergeUpdates) && typeof mergeUpdates === 'object') {
        // Literal values: { col: value } — each value is a new binding ($N)
        setClauses = Object.entries(mergeUpdates)
          .map(([col, val]) => {
            if (val !== null && typeof val === 'object' && typeof val.getValue === 'function') {
              return `${this.wrap(col)} = ${val.getValue()}`;
            }
            return `${this.wrap(col)} = ${this.parameter(val)}`;
          })
          .join(', ');
      } else {
        const cols: string[] = Array.isArray(mergeUpdates) && (mergeUpdates as string[]).length > 0
          ? mergeUpdates as string[]
          : Object.keys(values[0]);
        setClauses = cols.map(col => `${this.wrap(col)} = excluded.${this.wrap(col)}`).join(', ');
      }
      sql = `${insert} on conflict${targetClause} do update set ${setClauses}`;
    }

    // Append RETURNING after ON CONFLICT (correct PostgreSQL order)
    const returning = query['getReturning'] ? query.getReturning() : [];
    if (returning && returning.length > 0) {
      sql += ` returning ${this.columnize(returning)}`;
    }

    return sql;
  }

  /**
   * Reset parameter counter before compiling
   */
  compileInsert(query: any, values: any[]): string {
    this.parameterCounter = 0;
    return super.compileInsert(query, values);
  }

  protected compileInsertBase(query: any, values: any[]): string {
    // parameterCounter already reset by compileInsertOnConflict before calling this
    return super.compileInsertBase(query, values);
  }

  compileUpdate(query: any, values: any): string {
    this.parameterCounter = 0;
    return super.compileUpdate(query, values);
  }

  compileSelect(query: any): string {
    this.parameterCounter = 0;
    return super.compileSelect(query);
  }
  
  compileDelete(query: any): string {
    this.parameterCounter = 0;
    return super.compileDelete(query);
  }

  /**
   * Compile the "order by" portions of the query for PostgreSQL
   * Override to handle raw order clauses with ? placeholders
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
          // Replace ? placeholders with $N for PostgreSQL
          let sql = order.sql;
          const matches = sql.match(/\?/g);
          if (matches) {
            for (let i = 0; i < matches.length; i++) {
              sql = sql.replace('?', this.parameter());
            }
          }
          return sql;
        }
        return `${this.wrap(order.column)} ${order.direction}`;
      })
      .join(', ');

    return `order by ${compiled}`;
  }

  /**
   * Compile the "group by" portions of the query for PostgreSQL
   * Override to handle Raw group clauses with ? placeholder conversion
   */
  protected compileGroups(query: Builder, groups: any[]): string {
    if (!groups || groups.length === 0) {
      return '';
    }

    const compiled = groups.map((group) => {
      if (typeof group === 'object' && group.type === 'Raw') {
        // Replace ? placeholders with $N for PostgreSQL
        let sql = group.sql;
        const matches = sql.match(/\?/g);
        if (matches) {
          for (let i = 0; i < matches.length; i++) {
            sql = sql.replace('?', this.parameter());
          }
        }
        return sql;
      }
      return this.wrap(group);
    }).join(', ');

    return `group by ${compiled}`;
  }

  /**
   * Compile a "where year" clause using PostgreSQL EXTRACT.
   * Base Grammar generates MySQL-style year(col) which doesn't exist in PG.
   */
  protected whereYear(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const value = this.parameter(where.value);
    return `EXTRACT(YEAR FROM ${column}) ${where.operator} ${value}`;
  }

  /**
   * Compile a "where month" clause using PostgreSQL EXTRACT.
   */
  protected whereMonth(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const value = this.parameter(where.value);
    return `EXTRACT(MONTH FROM ${column}) ${where.operator} ${value}`;
  }

  /**
   * Compile a "where day" clause using PostgreSQL EXTRACT.
   */
  protected whereDay(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const value = this.parameter(where.value);
    return `EXTRACT(DAY FROM ${column}) ${where.operator} ${value}`;
  }

  /**
   * Compile a "where time" clause using PostgreSQL time casting.
   */
  protected whereTime(query: Builder, where: any): string {
    const column = this.wrap(where.column);
    const value = this.parameter(where.value);
    return `${column}::time ${where.operator} ${value}`;
  }
}
