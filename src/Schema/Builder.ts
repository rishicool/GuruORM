import { Connection } from '../Connection/Connection';
import { Grammar } from './Grammars/Grammar';

/**
 * Schema Builder - inspired by Laravel's Schema Builder
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
   * Enable foreign key constraints
   */
  async enableForeignKeyConstraints(): Promise<void> {
    const sql = this.grammar.compileEnableForeignKeyConstraints();
    await this.connection.statement(sql);
  }

  /**
   * Disable foreign key constraints
   */
  async disableForeignKeyConstraints(): Promise<void> {
    const sql = this.grammar.compileDisableForeignKeyConstraints();
    await this.connection.statement(sql);
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
