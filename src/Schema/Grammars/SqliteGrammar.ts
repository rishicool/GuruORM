import { Grammar } from './Grammar';

/**
 * SQLite Schema Grammar - extends base Schema Grammar for SQLite-specific DDL.
 *
 * Key SQLite differences:
 * - Uses double-quote (ANSI) or bare identifiers (no backticks).
 * - No AUTO_INCREMENT — INTEGER PRIMARY KEY is auto-increment by convention.
 * - No ENUM — mapped to VARCHAR.
 * - Foreign keys disabled by default — PRAGMA foreign_keys = ON.
 * - Type affinity system — types are advisory.
 * - No UNSIGNED modifier.
 */
export class SqliteGrammar extends Grammar {
  /**
   * Wrap a value in keyword identifiers (SQLite uses double quotes)
   */
  wrap(value: string): string {
    if (value === '*') {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Compile the command to enable foreign key constraints
   */
  compileEnableForeignKeyConstraints(): string {
    return 'PRAGMA foreign_keys = ON';
  }

  /**
   * Compile the command to disable foreign key constraints
   */
  compileDisableForeignKeyConstraints(): string {
    return 'PRAGMA foreign_keys = OFF';
  }

  /**
   * Compile the query to determine if a table exists
   */
  compileTableExists(): string {
    return "select * from sqlite_master where type = 'table' and name = ?";
  }

  /**
   * Compile the query to get column listing
   */
  compileColumnListing(): string {
    return 'pragma table_info(?)';
  }

  /**
   * Compile the query to get column type
   */
  compileColumnType(): string {
    return 'pragma table_info(?)';
  }

  /**
   * Compile the query to get all tables
   */
  compileGetAllTables(): string {
    return "select name from sqlite_master where type = 'table' and name not like 'sqlite_%'";
  }

  /**
   * Compile the query to check if an index exists
   */
  compileIndexExists(): string {
    return "SELECT 1 FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name = ? LIMIT 1";
  }

  /**
   * Compile a rename table command (SQLite uses ALTER TABLE ... RENAME TO)
   */
  compileRenameTable(from: string, to: string): string {
    return `alter table ${this.wrapTable(from)} rename to ${this.wrapTable(to)}`;
  }

  /**
   * Compile a drop column command.
   * Note: DROP COLUMN supported since SQLite 3.35.0 (2021-03-12).
   */
  compileDropColumn(table: string, column: string): string {
    return `alter table ${this.wrapTable(table)} drop column ${this.wrap(column)}`;
  }

  /**
   * Compile a rename column command.
   * Note: RENAME COLUMN supported since SQLite 3.25.0 (2018-09-15).
   */
  compileRenameColumn(table: string, from: string, to: string): string {
    return `alter table ${this.wrapTable(table)} rename column ${this.wrap(from)} to ${this.wrap(to)}`;
  }

  /**
   * Compile a column definition from a ColumnDefinition object (SQLite-specific)
   */
  compileColumn(column: any): string {
    const type = this.getType(column);
    let sql = `${this.wrap(column.name)} ${type}`;

    // INTEGER PRIMARY KEY is auto-increment in SQLite by convention
    const isAutoInc = column.type.toLowerCase() === 'increments' ||
                      column.type.toLowerCase() === 'bigincrements';

    const nullable = column._nullable !== undefined ? column._nullable : (typeof column.nullable === 'boolean' ? column.nullable : undefined);
    const primary = column._primary !== undefined ? column._primary : (typeof column.primary === 'boolean' ? column.primary : false);
    const unique = column._unique !== undefined ? column._unique : (typeof column.unique === 'boolean' ? column.unique : false);
    const defaultVal = column._default !== undefined ? column._default : column.default;

    if (isAutoInc) {
      sql += ' primary key autoincrement';
      return sql;
    }

    if (nullable === false || primary) {
      sql += ' not null';
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

  /**
   * Get the SQL type for a column (SQLite type affinity)
   */
  protected getType(column: any): string {
    const type = column.type.toLowerCase();

    switch (type) {
      case 'increments':
      case 'bigincrements':
        return 'integer';
      case 'string':
      case 'varchar':
        return `varchar(${column.length || 255})`;
      case 'text':
      case 'mediumtext':
      case 'longtext':
        return 'text';
      case 'integer':
      case 'int':
      case 'biginteger':
      case 'bigint':
      case 'tinyinteger':
      case 'tinyint':
      case 'smallinteger':
      case 'smallint':
      case 'mediuminteger':
      case 'mediumint':
        return 'integer';
      case 'float':
      case 'double':
        return 'real';
      case 'decimal':
        return 'numeric';
      case 'boolean':
        return 'tinyint(1)';
      case 'date':
      case 'datetime':
      case 'timestamp':
      case 'time':
        return 'datetime';
      case 'year':
        return 'integer';
      case 'char':
        return `varchar(${column.length || 255})`;
      case 'binary':
        return 'blob';
      case 'enum':
        return 'varchar(255)';
      case 'json':
        return 'text';
      default:
        return type;
    }
  }
}
