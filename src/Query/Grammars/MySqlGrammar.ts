import { Grammar as BaseGrammar } from './Grammar';
import { Builder } from '../Builder';

/**
 * MySQL Grammar class - extends base grammar for MySQL specific syntax
 */
export class Grammar extends BaseGrammar {
  /**
   * Wrap a single string in keyword identifiers (MySQL uses backticks).
   * Delegates to the custom wrapIdentifier hook when configured.
   */
  protected wrapValue(value: string): string {
    if (value === '*') {
      return value;
    }

    const origImpl = (v: string) => `\`${v.replace(/`/g, '``')}\``;

    if (this.customWrapIdentifier) {
      return this.customWrapIdentifier(value, origImpl);
    }

    return origImpl(value);
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
   * Compile an "insert ignore" statement into SQL.
   * MySQL uses INSERT IGNORE syntax.
   */
  compileInsertOrIgnore(query: Builder, values: any[]): string {
    return this.compileInsert(query, values).replace('insert', 'insert ignore');
  }

  /**
   * Compile an upsert statement into SQL.
   * MySQL uses ON DUPLICATE KEY UPDATE syntax.
   */
  compileUpsert(query: Builder, values: any[], uniqueBy: string[], update?: string[]): string {
    const insert = this.compileInsert(query, values);
    const columns = update || Object.keys(values[0]).filter(k => !uniqueBy.includes(k));
    const updateClause = columns
      .map(col => `${this.wrap(col)} = values(${this.wrap(col)})`)
      .join(', ');

    return `${insert} on duplicate key update ${updateClause}`;
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
