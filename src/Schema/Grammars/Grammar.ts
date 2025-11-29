/**
 * Base Schema Grammar class - inspired by Laravel's Schema Grammar
 * Compiles schema builder commands into SQL statements
 */
export class Grammar {
  protected tablePrefix = '';

  /**
   * Set the grammar table prefix
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
  wrapTable(table: string): string {
    return this.wrap(this.tablePrefix + table);
  }

  /**
   * Wrap a value in keyword identifiers
   */
  protected wrap(value: string): string {
    if (value === '*') {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Compile the query to determine if a table exists
   */
  compileTableExists(): string {
    return 'select * from information_schema.tables where table_schema = ? and table_name = ?';
  }

  /**
   * Compile the query to determine the list of columns
   */
  compileColumnListing(): string {
    return 'select column_name from information_schema.columns where table_schema = ? and table_name = ?';
  }

  /**
   * Compile a drop table command
   */
  compileDropTable(table: string): string {
    return `drop table ${this.wrapTable(table)}`;
  }

  /**
   * Compile a drop table (if exists) command
   */
  compileDropTableIfExists(table: string): string {
    return `drop table if exists ${this.wrapTable(table)}`;
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
