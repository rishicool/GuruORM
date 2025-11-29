import { Grammar } from './Grammar';

/**
 * PostgreSQL Schema Grammar - extends base Schema Grammar
 * PostgreSQL-specific DDL statements
 */
export class PostgresGrammar extends Grammar {
  /**
   * Compile the query to determine if a table exists
   */
  compileTableExists(): string {
    return 'select * from information_schema.tables where table_schema = $1 and table_name = $2';
  }

  /**
   * Compile the query to determine the list of columns
   */
  compileColumnListing(): string {
    return 'select column_name from information_schema.columns where table_schema = $1 and table_name = $2';
  }

  /**
   * Compile the query to get column type
   */
  compileColumnType(): string {
    return 'select data_type from information_schema.columns where table_schema = $1 and table_name = $2 and column_name = $3';
  }

  /**
   * Compile the command to enable foreign key constraints
   */
  compileEnableForeignKeyConstraints(): string {
    return 'SET CONSTRAINTS ALL IMMEDIATE;';
  }

  /**
   * Compile the command to disable foreign key constraints
   */
  compileDisableForeignKeyConstraints(): string {
    return 'SET CONSTRAINTS ALL DEFERRED;';
  }

  /**
   * Compile the query to get all tables
   */
  compileGetAllTables(): string {
    return "select tablename from pg_catalog.pg_tables where schemaname not in ('pg_catalog', 'information_schema')";
  }

  /**
   * Get the SQL type for a column (PostgreSQL-specific)
   */
  protected getType(column: any): string {
    const type = column.type.toLowerCase();

    switch (type) {
      case 'increments':
        return 'serial';
      case 'bigincrements':
        return 'bigserial';
      case 'string':
      case 'varchar':
        return `varchar(${column.length || 255})`;
      case 'text':
      case 'mediumtext':
      case 'longtext':
        return 'text';
      case 'integer':
      case 'int':
        return 'integer';
      case 'biginteger':
      case 'bigint':
        return 'bigint';
      case 'tinyinteger':
      case 'tinyint':
        return 'smallint';
      case 'smallinteger':
      case 'smallint':
        return 'smallint';
      case 'mediuminteger':
      case 'mediumint':
        return 'integer';
      case 'float':
        return 'real';
      case 'double':
        return 'double precision';
      case 'decimal':
        return `decimal(${column.precision || 8}, ${column.scale || 2})`;
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'date';
      case 'datetime':
        return 'timestamp';
      case 'timestamp':
        return 'timestamp';
      case 'time':
        return 'time';
      case 'year':
        return 'integer';
      case 'char':
        return `char(${column.length || 255})`;
      case 'binary':
        return 'bytea';
      case 'enum':
        return `varchar(255)`;  // PostgreSQL enums need CREATE TYPE
      case 'json':
        return 'json';
      case 'jsonb':
        return 'jsonb';
      default:
        return type;
    }
  }

  /**
   * Compile a column definition from a ColumnDefinition object (PostgreSQL-specific)
   */
  compileColumn(column: any): string {
    let sql = `${this.wrap(column.name)} ${this.getType(column)}`;

    // For SERIAL types, we don't need NOT NULL or PRIMARY KEY here
    // SERIAL already implies NOT NULL
    if (column.type.toLowerCase() === 'increments' || column.type.toLowerCase() === 'bigincrements') {
      const primary = column._primary !== undefined ? column._primary : (typeof column.primary === 'boolean' ? column.primary : false);
      if (primary) {
        sql += ' primary key';
      }
      return sql;
    }

    // Add modifiers
    const nullable = column._nullable !== undefined ? column._nullable : (typeof column.nullable === 'boolean' ? column.nullable : undefined);
    const primary = column._primary !== undefined ? column._primary : (typeof column.primary === 'boolean' ? column.primary : false);
    const unique = column._unique !== undefined ? column._unique : (typeof column.unique === 'boolean' ? column.unique : false);
    const defaultVal = column._default !== undefined ? column._default : column.default;
    
    if (nullable === false || primary) {
      sql += ' not null';
    } else if (nullable) {
      sql += ' null';
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

    return sql;
  }
}
