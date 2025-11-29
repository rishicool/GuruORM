import { Grammar as BaseGrammar } from './Grammar';

/**
 * MySQL Schema Grammar class - extends base schema grammar for MySQL specific syntax
 */
export class Grammar extends BaseGrammar {
  /**
   * Wrap a single string in keyword identifiers
   */
  protected wrap(value: string): string {
    if (value === '*') {
      return value;
    }

    return `\`${value.replace(/`/g, '``')}\``;
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
