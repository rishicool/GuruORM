import { Grammar as BaseGrammar } from './Grammar';
import { Builder } from '../Builder';

/**
 * MySQL Grammar class - extends base grammar for MySQL specific syntax
 */
export class Grammar extends BaseGrammar {
  /**
   * Wrap a single string in keyword identifiers
   */
  protected wrapValue(value: string): string {
    if (value === '*') {
      return value;
    }

    return `\`${value.replace(/`/g, '``')}\``;
  }

  /**
   * Compile an insert and get ID statement into SQL
   * MySQL doesn't support RETURNING, so we just return the insert statement
   * The insertId will be retrieved from the connection result
   */
  compileInsertGetId(query: Builder, values: any, sequence?: string): string {
    return this.compileInsert(query, [values]);
  }

  /**
   * Compile a rename table command
   */
  compileRenameTable(from: string, to: string): string {
    return `rename table ${this.wrapTable(from)} to ${this.wrapTable(to)}`;
  }

  /**
   * Compile the command to enable foreign key constraints
   */
  compileEnableForeignKeyConstraints(): string {
    return 'SET FOREIGN_KEY_CHECKS=1;';
  }

  /**
   * Compile the command to disable foreign key constraints
   */
  compileDisableForeignKeyConstraints(): string {
    return 'SET FOREIGN_KEY_CHECKS=0;';
  }
}
