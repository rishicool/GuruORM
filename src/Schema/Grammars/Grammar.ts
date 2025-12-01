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

  /**
   * Compile a column definition from a ColumnDefinition object
   */
  compileColumn(column: any): string {
    let sql = `${this.wrap(column.name)} ${this.getType(column)}`;

    // Add modifiers - check both underscore-prefixed and regular properties
    const nullable = column._nullable !== undefined ? column._nullable : (typeof column.nullable === 'boolean' ? column.nullable : undefined);
    const primary = column._primary !== undefined ? column._primary : (typeof column.primary === 'boolean' ? column.primary : false);
    const unique = column._unique !== undefined ? column._unique : (typeof column.unique === 'boolean' ? column.unique : false);
    const defaultVal = column._default !== undefined ? column._default : column.default;
    const comment = column._comment !== undefined ? column._comment : (typeof column.comment === 'string' ? column.comment : undefined);
    
    if (nullable === false || primary || column.autoIncrement) {
      sql += ' not null';
    } else if (nullable) {
      sql += ' null';
    }

    if (column.autoIncrement) {
      sql += ' auto_increment';
    }

    if (primary) {
      sql += ' primary key';
    }

    if (unique) {
      sql += ' unique';
    }

    if (defaultVal !== undefined && defaultVal !== null) {
      sql += ` default ${this.wrapDefaultValue(defaultVal)}`;
    }

    if (comment) {
      sql += ` comment '${comment}'`;
    }

    return sql;
  }

  /**
   * Get the SQL type for a column
   */
  protected getType(column: any): string {
    const type = column.type.toLowerCase();

    switch (type) {
      case 'increments':
        return 'int unsigned';
      case 'bigincrements':
        return 'bigint unsigned';
      case 'string':
      case 'varchar':
        return `varchar(${column.length || 255})`;
      case 'text':
        return 'text';
      case 'mediumtext':
        return 'mediumtext';
      case 'longtext':
        return 'longtext';
      case 'integer':
      case 'int':
        return column.unsigned ? 'int unsigned' : 'int';
      case 'biginteger':
      case 'bigint':
        return column.unsigned ? 'bigint unsigned' : 'bigint';
      case 'tinyinteger':
      case 'tinyint':
        return column.unsigned ? 'tinyint unsigned' : 'tinyint';
      case 'smallinteger':
      case 'smallint':
        return column.unsigned ? 'smallint unsigned' : 'smallint';
      case 'mediuminteger':
      case 'mediumint':
        return column.unsigned ? 'mediumint unsigned' : 'mediumint';
      case 'float':
        return column.precision ? `float(${column.precision}, ${column.scale || 2})` : 'float';
      case 'double':
        return column.precision ? `double(${column.precision}, ${column.scale || 2})` : 'double';
      case 'decimal':
        return `decimal(${column.precision || 8}, ${column.scale || 2})`;
      case 'boolean':
        return 'tinyint(1)';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime';
      case 'timestamp':
        return 'timestamp';
      case 'time':
        return 'time';
      case 'year':
        return 'year';
      case 'char':
        return `char(${column.length || 255})`;
      case 'binary':
        return 'blob';
      case 'enum':
        return `enum(${column.allowed.map((v: string) => `'${v}'`).join(', ')})`;
      case 'json':
        return 'json';
      default:
        return type;
    }
  }

  /**
   * Wrap a default value
   */
  protected wrapDefaultValue(value: any): string {
    // Handle raw SQL values
    if (typeof value === 'object' && value !== null && '__raw' in value) {
      return value.__raw;
    }
    
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }
}
