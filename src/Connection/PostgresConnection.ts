import { Pool, PoolClient } from 'pg';
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
  /** Cached flag: true only when user supplied a postProcessResponse hook */
  private _hasPostProcess: boolean;
  /** Cached read client — avoids the || fallback on every query */
  private _readPool: Pool;
  /** Dedicated client checked out for the duration of a transaction */
  private _txClient: PoolClient | null = null;

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
    this._hasPostProcess = typeof this.config.postProcessResponse === 'function';
    this._readPool = (this.readClient || this.pool) as Pool;
  }

  /**
   * Create the PostgreSQL connection pool
   */
  protected async createConnection(): Promise<void> {
    // Pool is already created in constructor
    // This method kept for consistency with base class
  }

  /**
   * Convert ? placeholders to PostgreSQL $1, $2, etc format.
   * Fast-path: returns the input unchanged when there are no ? chars.
   */
  protected convertBindings(query: string): string {
    if (query.indexOf('?') === -1) return query;
    let index = 0;
    return query.replace(/\?/g, () => `$${++index}`);
  }

  /**
   * Run a select statement against the database.
   * Hot path — every micro-second counts here.
   */
  async select(query: string, bindings: any[] = [], useReadPdo = true): Promise<any[]> {
    const pgQuery = query.indexOf('?') === -1 ? query : this.convertBindings(query);
    
    try {
      const connection = this._txClient || (useReadPdo ? this._readPool : this.pool!);
      const result = await connection.query(pgQuery, bindings);
      
      if (this.loggingQueries) {
        this.queryLog.push({ query: pgQuery, bindings, time: 0 });
      }
      
      return this._hasPostProcess
        ? this.config.postProcessResponse!(result.rows)
        : result.rows;
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
    const pgQuery = query.indexOf('?') === -1 ? query : this.convertBindings(query);
    
    try {
      await (this._txClient || this.pool!).query(pgQuery, bindings);
      
      if (this.loggingQueries) {
        this.queryLog.push({ query: pgQuery, bindings, time: 0 });
      }
      
      return true;
    } catch (error) {
      throw this.handleQueryException(error as Error, pgQuery, bindings);
    }
  }

  /**
   * Run an SQL statement and get the number of rows affected
   */
  async affectingStatement(query: string, bindings: any[] = []): Promise<number> {
    const pgQuery = query.indexOf('?') === -1 ? query : this.convertBindings(query);
    
    try {
      const result = await (this._txClient || this.pool!).query(pgQuery, bindings);
      
      if (this.loggingQueries) {
        this.queryLog.push({ query: pgQuery, bindings, time: 0 });
      }
      
      return result.rowCount || 0;
    } catch (error) {
      throw this.handleQueryException(error as Error, pgQuery, bindings);
    }
  }

  /**
   * Run a raw, unprepared query against the database.
   * Used for BEGIN / COMMIT / ROLLBACK — must be as fast as possible.
   */
  async unprepared(query: string): Promise<boolean> {
    try {
      await (this._txClient || this.pool!).query(query);
      return true;
    } catch (error) {
      throw this.handleQueryException(error as Error, query, []);
    }
  }

  /**
   * Create a transaction — checks out a dedicated client from the pool.
   * All queries inside the transaction use this client.
   */
  protected async createTransaction(): Promise<void> {
    if (this.transactions === 0) {
      this._txClient = await this.pool!.connect();
      await this._txClient.query('BEGIN');
    } else {
      await this._txClient!.query(`SAVEPOINT sp${this.transactions + 1}`);
    }
  }

  /**
   * Perform a commit and release the dedicated client back to the pool.
   */
  protected async performCommit(): Promise<void> {
    const client = this._txClient!;
    this._txClient = null;
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Perform a rollback — release the client on full rollback.
   */
  protected async performRollBack(toLevel: number): Promise<void> {
    if (toLevel === 0) {
      const client = this._txClient!;
      this._txClient = null;
      await client.query('ROLLBACK');
      client.release();
    } else {
      await this._txClient!.query(`ROLLBACK TO SAVEPOINT sp${toLevel + 1}`);
    }
  }

  /**
   * Set the query grammar to the default implementation
   */
  protected useDefaultQueryGrammar(): void {
    this.setQueryGrammar(new PostgresGrammar());
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
