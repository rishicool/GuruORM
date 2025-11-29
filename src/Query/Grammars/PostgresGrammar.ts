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

    // Basic having clause
    const value = this.parameter(having.value);
    return `${having.boolean} ${this.wrap(having.column)} ${having.operator} ${value}`;
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
   * Compile an insert and get ID statement for PostgreSQL
   */
  compileInsertGetId(query: any, values: any, sequence?: string): string {
    const insert = this.compileInsert(query, [values]);
    return `${insert} returning ${this.wrap(sequence || 'id')}`;
  }

  /**
   * Reset parameter counter before compiling
   */
  compileInsert(query: any, values: any[]): string {
    this.parameterCounter = 0;
    return super.compileInsert(query, values);
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
}
