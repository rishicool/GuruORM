// @ts-ignore - tedious types may not be available
import { ConnectionPool, Request } from 'tedious';
import { Connection } from './Connection';
import { ConnectionConfig } from './ConnectionInterface';
import { Grammar as QueryGrammar } from '../Query/Grammars/Grammar';
import { Grammar as SchemaGrammar } from '../Schema/Grammars/Grammar';
import { Processor } from '../Query/Processors/Processor';

/**
 * SQL Server Connection - inspired by Laravel and Illuminate
 */
export class SqlServerConnection extends Connection {
  protected pool: any | null = null;
  protected poolPromise: Promise<void> | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    
    // Initialize grammars and processor
    this.useDefaultQueryGrammar();
    this.useDefaultSchemaGrammar();
    this.useDefaultPostProcessor();
    
    // Start connection but don't await in constructor
    this.poolPromise = this.createConnection();
  }

  /**
   * Create the SQL Server connection pool
   */
  protected async createConnection(): Promise<void> {
    const poolConfig = {
      server: this.config.host || 'localhost',
      options: {
        port: this.config.port || 1433,
        database: this.config.database,
        trustServerCertificate: true,
        encrypt: true,
      },
      authentication: {
        type: 'default' as const,
        options: {
          userName: this.config.username,
          password: this.config.password,
        },
      },
      pool: {
        max: this.config.pool?.max || 10,
        min: this.config.pool?.min || 0,
        idleTimeoutMillis: 30000,
      },
    };

    this.pool = new ConnectionPool(poolConfig);
    await this.pool.connect();
    this.client = this.pool;
  }

  /**
   * Ensure connection is ready
   */
  protected async ensureConnected(): Promise<void> {
    if (this.poolPromise) {
      await this.poolPromise;
      this.poolPromise = null;
    }
  }

  /**
   * Run a select statement against the database
   */
  async select(query: string, bindings: any[] = [], useReadPdo = true): Promise<any[]> {
    await this.ensureConnected();
    const startTime = Date.now();
    
    try {
      const connection = useReadPdo ? this.getReadClient() : this.getClient();
      const request = connection.request();
      
      // Bind parameters
      bindings.forEach((value, index) => {
        request.input(`p${index}`, value);
      });
      
      // Replace ? with @p0, @p1, etc.
      let paramIndex = 0;
      const parameterizedQuery = query.replace(/\?/g, () => `@p${paramIndex++}`);
      
      const result = await request.query(parameterizedQuery);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return result.recordset || [];
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
    await this.ensureConnected();
    const startTime = Date.now();
    
    try {
      const request = this.getClient().request();
      
      bindings.forEach((value, index) => {
        request.input(`p${index}`, value);
      });
      
      let paramIndex = 0;
      const parameterizedQuery = query.replace(/\?/g, () => `@p${paramIndex++}`);
      
      await request.query(parameterizedQuery);
      
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
    await this.ensureConnected();
    const startTime = Date.now();
    
    try {
      const request = this.getClient().request();
      
      bindings.forEach((value, index) => {
        request.input(`p${index}`, value);
      });
      
      let paramIndex = 0;
      const parameterizedQuery = query.replace(/\?/g, () => `@p${paramIndex++}`);
      
      const result = await request.query(parameterizedQuery);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return result.rowsAffected[0] || 0;
    } catch (error) {
      throw this.handleQueryException(error as Error, query, bindings);
    }
  }

  /**
   * Run a raw, unprepared query against the database
   */
  async unprepared(query: string): Promise<boolean> {
    await this.ensureConnected();
    const startTime = Date.now();
    
    try {
      await this.getClient().request().query(query);
      
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
      await this.unprepared(`ROLLBACK TRANSACTION sp${toLevel}`);
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
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.client = null;
    }
  }

  /**
   * Get the name of the connected database driver
   */
  getDriverName(): string {
    return 'sqlserver';
  }
}
