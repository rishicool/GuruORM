import { Grammar as BaseGrammar } from './Grammar';

/**
 * MySQL Schema Grammar class - extends base schema grammar for MySQL specific syntax
 */
export class Grammar extends BaseGrammar {
  /**
   * Wrap a single string in keyword identifiers
   */
  public wrap(value: string): string {
    if (value === '*') {
      return value;
    }

    return `\`${value.replace(/`/g, '``')}\``;
  }

  /**
   * Compile a rename table command (MySQL uses RENAME TABLE syntax)
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

  /**
   * Compile a create table command with MySQL-specific options (engine, charset, collation, comment)
   */
  compileCreateTable(table: string, columns: string[], options: any = {}): string {
    let sql = super.compileCreateTable(table, columns, options);

    if (options.engine) {
      sql += ` engine = ${options.engine}`;
    }

    if (options.charset) {
      sql += ` default charset = ${options.charset}`;
    }

    if (options.collation) {
      sql += ` collate = ${options.collation}`;
    }

    if (options.comment) {
      sql += ` comment = '${this.escapeString(options.comment)}'`;
    }

    return sql;
  }
}
