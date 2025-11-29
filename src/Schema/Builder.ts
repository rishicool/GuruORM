import { Connection } from '../Connection/Connection';
import { Grammar } from './Grammars/Grammar';

/**
 * Schema Builder - inspired by Laravel and Illuminate
 * Provides methods for creating and modifying database schema
 */
export class Builder {
  protected connection: Connection;
  protected grammar: Grammar;

  constructor(connection: Connection) {
    this.connection = connection;
    this.grammar = connection.getSchemaGrammar();
  }

  /**
   * Determine if the given table exists
   */
  async hasTable(table: string): Promise<boolean> {
    const sql = this.grammar.compileTableExists();
    const database = this.connection.getDatabaseName();

    const results = await this.connection.select(sql, [database, table]);
    return results.length > 0;
  }

  /**
   * Get the column listing for a given table
   */
  async getColumnListing(table: string): Promise<string[]> {
    const sql = this.grammar.compileColumnListing();
    const database = this.connection.getDatabaseName();

    const results = await this.connection.select(sql, [database, table]);
    return this.connection.getPostProcessor().processColumnListing(results);
  }

  /**
   * Create a new table on the schema
   */
  async create(table: string, callback: (blueprint: any) => void): Promise<void> {
    // Blueprint implementation will be added later
    throw new Error('Schema.create not yet implemented');
  }

  /**
   * Drop a table from the schema
   */
  async drop(table: string): Promise<void> {
    const sql = this.grammar.compileDropTable(table);
    await this.connection.statement(sql);
  }

  /**
   * Drop a table from the schema if it exists
   */
  async dropIfExists(table: string): Promise<void> {
    const sql = this.grammar.compileDropTableIfExists(table);
    await this.connection.statement(sql);
  }

  /**
   * Rename a table on the schema
   */
  async rename(from: string, to: string): Promise<void> {
    const sql = this.grammar.compileRenameTable(from, to);
    await this.connection.statement(sql);
  }

  /**
   * Determine if the given table has a given column
   */
  async hasColumn(table: string, column: string): Promise<boolean> {
    const columns = await this.getColumnListing(table);
    return columns.includes(column);
  }

  /**
   * Determine if the given table has given columns
   */
  async hasColumns(table: string, columns: string[]): Promise<boolean> {
    const tableColumns = await this.getColumnListing(table);
    return columns.every(column => tableColumns.includes(column));
  }

  /**
   * Determine if the given table has a given index
   */
  async hasIndex(table: string, indexName: string): Promise<boolean> {
    // This is database-specific, basic implementation
    try {
      const sql = `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`;
      const results = await this.connection.select(sql, [indexName]);
      return results.length > 0;
    } catch (error) {
      // Fallback for non-MySQL databases
      return false;
    }
  }

  /**
   * Get the data type for a given column
   */
  async getColumnType(table: string, column: string): Promise<string> {
    const sql = this.grammar.compileColumnType();
    const database = this.connection.getDatabaseName();
    
    const results = await this.connection.select(sql, [database, table, column]);
    if (results.length === 0) {
      throw new Error(`Column ${column} does not exist on table ${table}`);
    }
    
    return results[0].data_type;
  }

  /**
   * Modify a table on the schema
   */
  async table(table: string, callback: (blueprint: any) => void): Promise<void> {
    // Blueprint implementation for table modification
    throw new Error('Schema.table not yet implemented');
  }

  /**
   * Drop all tables from the database
   */
  async dropAllTables(): Promise<void> {
    const tables = await this.getAllTables();
    
    // Disable foreign key checks
    await this.connection.statement('SET FOREIGN_KEY_CHECKS=0');
    
    for (const table of tables) {
      await this.drop(table);
    }
    
    // Re-enable foreign key checks
    await this.connection.statement('SET FOREIGN_KEY_CHECKS=1');
  }

  /**
   * Get all tables from the database
   */
  async getAllTables(): Promise<string[]> {
    const sql = this.grammar.compileGetAllTables();
    const results = await this.connection.select(sql);
    return results.map((result: any) => Object.values(result)[0] as string);
  }

  /**
   * Enable foreign key constraints
   */
  async enableForeignKeyConstraints(): Promise<void> {
    await this.connection.statement(this.grammar.compileEnableForeignKeyConstraints());
  }

  /**
   * Disable foreign key constraints
   */
  async disableForeignKeyConstraints(): Promise<void> {
    await this.connection.statement(this.grammar.compileDisableForeignKeyConstraints());
  }

  /**
   * Execute callback with foreign key constraints disabled
   */
  async withoutForeignKeyConstraints(callback: () => Promise<void>): Promise<void> {
    await this.disableForeignKeyConstraints();
    
    try {
      await callback();
    } finally {
      await this.enableForeignKeyConstraints();
    }
  }

  /**
   * Get the database connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Set the database connection instance
   */
  setConnection(connection: Connection): this {
    this.connection = connection;
    return this;
  }
}
