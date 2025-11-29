/**
 * Base Schema Grammar class - inspired by Laravel and Illuminate
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

  /**
   * Compile the query to get column type
   */
  compileColumnType(): string {
    return 'select data_type from information_schema.columns where table_schema = ? and table_name = ? and column_name = ?';
  }

  /**
   * Compile the query to get all tables
   */
  compileGetAllTables(): string {
    return 'select table_name from information_schema.tables where table_schema = database()';
  }

  /**
   * Compile a create table command
   */
  compileCreateTable(table: string, columns: string[], options: any = {}): string {
    const columnDefinitions = columns.join(', ');
    let sql = `create table ${this.wrapTable(table)} (${columnDefinitions})`;
    
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
      sql += ` comment = '${options.comment}'`;
    }
    
    return sql;
  }

  /**
   * Compile an add column command
   */
  compileAddColumn(table: string, column: string): string {
    return `alter table ${this.wrapTable(table)} add ${column}`;
  }

  /**
   * Compile a drop column command
   */
  compileDropColumn(table: string, column: string): string {
    return `alter table ${this.wrapTable(table)} drop column ${this.wrap(column)}`;
  }

  /**
   * Compile a rename column command
   */
  compileRenameColumn(table: string, from: string, to: string): string {
    return `alter table ${this.wrapTable(table)} rename column ${this.wrap(from)} to ${this.wrap(to)}`;
  }

  /**
   * Compile a modify column command
   */
  compileModifyColumn(table: string, column: string): string {
    return `alter table ${this.wrapTable(table)} modify ${column}`;
  }
}
