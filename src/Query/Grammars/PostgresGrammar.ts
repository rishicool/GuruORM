import { Grammar } from './Grammar';

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
