import { Pool } from 'pg';
import { Connection } from './Connection';
import { ConnectionConfig } from './ConnectionInterface';
import { PostgresGrammar } from '../Query/Grammars/PostgresGrammar';
import { PostgresGrammar as SchemaPostgresGrammar } from '../Schema/Grammars/PostgresGrammar';
import { Processor } from '../Query/Processors/Processor';

/**
 * PostgreSQL Connection - inspired by Laravel and Illuminate
 */
export class PostgresConnection extends Connection {
  protected pool: Pool | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    
    // Initialize grammars and processor
    this.useDefaultQueryGrammar();
    this.useDefaultSchemaGrammar();
    this.useDefaultPostProcessor();
    
    // Don't await in constructor - pool creation is synchronous
    this.pool = new Pool({
      host: this.config.host || 'localhost',
      port: this.config.port || 5432,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      max: this.config.pool?.max || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.client = this.pool;
  }

  /**
   * Create the PostgreSQL connection pool
   */
  protected async createConnection(): Promise<void> {
    // Pool is already created in constructor
    // This method kept for consistency with base class
  }

  /**
   * Convert ? placeholders to PostgreSQL $1, $2, etc format
   */
  protected convertBindings(query: string): string {
    let index = 0;
    return query.replace(/\?/g, () => `$${++index}`);
  }

  /**
   * Run a select statement against the database
   */
  async select(query: string, bindings: any[] = [], useReadPdo = true): Promise<any[]> {
    const startTime = Date.now();
    
    // Convert ? to $1, $2, etc for PostgreSQL
    const pgQuery = this.convertBindings(query);
    
    try {
      const connection = useReadPdo ? this.getReadClient() : this.getClient();
      const result = await connection.query(pgQuery, bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(pgQuery, bindings, time);
      
      return result.rows;
    } catch (error) {
      throw this.handleQueryException(error as Error, pgQuery, bindings);
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
    
    // Convert ? to $1, $2, etc for PostgreSQL
    const pgQuery = this.convertBindings(query);
    
    try {
      await this.getClient().query(pgQuery, bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(pgQuery, bindings, time);
      
      return true;
    } catch (error) {
      throw this.handleQueryException(error as Error, pgQuery, bindings);
    }
  }

  /**
   * Run an SQL statement and get the number of rows affected
   */
  async affectingStatement(query: string, bindings: any[] = []): Promise<number> {
    const startTime = Date.now();
    
    // Convert ? to $1, $2, etc for PostgreSQL
    const pgQuery = this.convertBindings(query);
    
    try {
      const result = await this.getClient().query(pgQuery, bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(pgQuery, bindings, time);
      
      return result.rowCount || 0;
    } catch (error) {
      throw this.handleQueryException(error as Error, pgQuery, bindings);
    }
  }

  /**
   * Run a raw, unprepared query against the database
   */
  async unprepared(query: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.getClient().query(query);
      
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
    if (this.transactions === 0) {
      await this.unprepared('BEGIN');
    } else {
      // Create savepoint for nested transaction
      await this.unprepared(`SAVEPOINT sp${this.transactions + 1}`);
    }
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
      await this.unprepared(`ROLLBACK TO SAVEPOINT sp${toLevel + 1}`);
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
    this.queryGrammar = new PostgresGrammar();
  }

  /**
   * Set the schema grammar to the default implementation
   */
  protected useDefaultSchemaGrammar(): void {
    this.schemaGrammar = new SchemaPostgresGrammar();
  }

  /**
   * Get the schema name for PostgreSQL (always 'public' by default)
   */
  getSchemaName(): string {
    return this.config.schema || 'public';
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
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.client = null;
    }
  }

  /**
   * Get the name of the connected database driver
   */
  getDriverName(): string {
    return 'pgsql';
  }
}
