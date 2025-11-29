import { Connection } from './Connection';
import { ConnectionConfig } from './ConnectionInterface';
import { Grammar as QueryGrammar } from '../Query/Grammars/Grammar';
import { Grammar as SchemaGrammar } from '../Schema/Grammars/Grammar';
import { Processor } from '../Query/Processors/Processor';

/**
 * SQLite Connection - inspired by Laravel and Illuminate
 */
export class SqliteConnection extends Connection {
  protected db: any | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    this.createConnection();
  }

  /**
   * Create the SQLite connection
   */
  protected async createConnection(): Promise<void> {
    try {
      // Dynamic import to handle optional dependency
      const Database = (await import('better-sqlite3')).default;
      const dbPath = this.config.database || ':memory:';
      this.db = new Database(dbPath);

      this.client = this.db;
    } catch (error) {
      throw new Error(
        'better-sqlite3 package is required for SQLite support. Install it with: npm install better-sqlite3'
      );
    }
  }

  /**
   * Run a select statement against the database
   */
  async select(query: string, bindings: any[] = [], useReadPdo = true): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      const stmt = this.getClient().prepare(query);
      const rows = stmt.all(...bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return rows;
    } catch (error) {
      throw this.handleQueryException(error as Error, query, bindings);
    }
  }

  /**
   * Run an insert statement against the database
   */
  async insert(query: string, bindings: any[] = []): Promise<boolean> {
    return this.statement(query, bindings);
  }

  /**
   * Run an update statement against the database
   */
  async update(query: string, bindings: any[] = []): Promise<number> {
    return this.affectingStatement(query, bindings);
  }

  /**
   * Run a delete statement against the database
   */
  async delete(query: string, bindings: any[] = []): Promise<number> {
    return this.affectingStatement(query, bindings);
  }

  /**
   * Execute an SQL statement and return the boolean result
   */
  async statement(query: string, bindings: any[] = []): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const stmt = this.getClient().prepare(query);
      stmt.run(...bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return true;
    } catch (error) {
      throw this.handleQueryException(error as Error, query, bindings);
    }
  }

  /**
   * Run an SQL statement and get the number of rows affected
   */
  async affectingStatement(query: string, bindings: any[] = []): Promise<number> {
    const startTime = Date.now();
    
    try {
      const stmt = this.getClient().prepare(query);
      const result = stmt.run(...bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return result.changes || 0;
    } catch (error) {
      throw this.handleQueryException(error as Error, query, bindings);
    }
  }

  /**
   * Run a raw, unprepared query against the database
   */
  async unprepared(query: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.getClient().exec(query);
      
      const time = Date.now() - startTime;
      this.logQuery(query, [], time);
      
      return true;
    } catch (error) {
      throw this.handleQueryException(error as Error, query, []);
    }
  }

  /**
   * Create a transaction within the database
   */
  protected async createTransaction(): Promise<void> {
    await this.unprepared('BEGIN TRANSACTION');
  }

  /**
   * Perform a commit on the database
   */
  protected async performCommit(): Promise<void> {
    await this.unprepared('COMMIT');
  }

  /**
   * Perform a rollback on the database
   */
  protected async performRollBack(toLevel: number): Promise<void> {
    if (toLevel === 0) {
      await this.unprepared('ROLLBACK');
    } else {
      await this.unprepared(`ROLLBACK TO SAVEPOINT sp${toLevel}`);
    }
  }

  /**
   * Handle a query exception
   */
  protected handleQueryException(error: Error, query: string, bindings: any[]): Error {
    return error;
  }

  /**
   * Set the query grammar to the default implementation
   */
  protected useDefaultQueryGrammar(): void {
    this.queryGrammar = new QueryGrammar();
  }

  /**
   * Set the schema grammar to the default implementation
   */
  protected useDefaultSchemaGrammar(): void {
    this.schemaGrammar = new SchemaGrammar();
  }

  /**
   * Set the query post processor to the default implementation
   */
  protected useDefaultPostProcessor(): void {
    this.postProcessor = new Processor();
  }

  /**
   * Disconnect from the underlying database
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.client = null;
    }
  }

  /**
   * Get the name of the connected database driver
   */
  getDriverName(): string {
    return 'sqlite';
  }
}
