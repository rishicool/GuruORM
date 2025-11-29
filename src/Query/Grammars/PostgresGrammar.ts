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
}
