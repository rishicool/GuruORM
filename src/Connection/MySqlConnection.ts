import mysql from 'mysql2/promise';
import { Connection } from './Connection';
import { ConnectionConfig } from './ConnectionInterface';
import { Grammar as QueryGrammar } from '../Query/Grammars/MySqlGrammar';
import { Grammar as SchemaGrammar } from '../Schema/Grammars/MySqlGrammar';
import { Processor } from '../Query/Processors/Processor';

/**
 * MySQL Connection class - inspired by Laravel and Illuminate
 */
export class MySqlConnection extends Connection {
  protected pool: mysql.Pool | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    
    // Initialize grammars and processor
    this.useDefaultQueryGrammar();
    this.useDefaultSchemaGrammar();
    this.useDefaultPostProcessor();
    
    this.createConnection();
  }

  /**
   * Create the MySQL connection pool
   */
  protected async createConnection(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host || 'localhost',
      port: this.config.port || 3306,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      charset: this.config.charset || 'utf8mb4',
      timezone: this.config.timezone || 'Z',
      waitForConnections: true,
      connectionLimit: this.config.pool?.max || 10,
      queueLimit: 0,
    });

    this.client = this.pool;
  }

  /**
   * Run a select statement against the database
   */
  async select(query: string, bindings: any[] = [], useReadPdo = true): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      const connection = useReadPdo ? this.getReadClient() : this.getClient();
      const [rows] = await connection.execute(query, bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return rows as any[];
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
   * Insert a record and return the last insert ID (MySQL-specific)
   */
  async insertGetId(query: string, bindings: any[] = []): Promise<number> {
    const startTime = Date.now();
    
    try {
      const [result] = await this.getClient().execute(query, bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      // MySQL returns insertId in the result
      const insertId = (result as any).insertId;
      return typeof insertId === 'number' ? insertId : parseInt(String(insertId), 10);
    } catch (error) {
      throw this.handleQueryException(error as Error, query, bindings);
    }
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
      await this.getClient().execute(query, bindings);
      
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
      const [result] = await this.getClient().execute(query, bindings);
      
      const time = Date.now() - startTime;
      this.logQuery(query, bindings, time);
      
      return (result as any).affectedRows || 0;
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
    await this.unprepared('START TRANSACTION');
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
    // Enhanced error handling can be added here
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
      await this.pool.end();
      this.pool = null;
      this.client = null;
    }
  }

  /**
   * Get the name of the connected database driver
   */
  getDriverName(): string {
    return 'mysql';
  }
}
