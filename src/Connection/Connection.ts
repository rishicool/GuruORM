import { ConnectionInterface, ConnectionConfig } from './ConnectionInterface';
import { Expression } from '../Query/Expression';
import { Builder as QueryBuilder } from '../Query/Builder';
import { Builder as SchemaBuilder } from '../Schema/Builder';

/**
 * Base connection class - inspired by Laravel and Illuminate
 * Provides core database connection functionality
 */
export abstract class Connection implements ConnectionInterface {
  protected config: ConnectionConfig;
  protected name: string | null = null;
  protected client: any = null;
  protected readClient: any = null;
  protected queryGrammar: any = null;
  protected schemaGrammar: any = null;
  protected postProcessor: any = null;
  protected tablePrefix = '';
  protected transactions = 0;
  protected queryLog: Array<{ query: string; bindings: any[]; time: number }> = [];
  protected loggingQueries = false;
  protected pretend = false;
  protected reconnector: (() => Promise<void>) | null = null;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.tablePrefix = config.prefix || '';
    this.useDefaultQueryGrammar();
    this.useDefaultSchemaGrammar();
    this.useDefaultPostProcessor();
  }

  /**
   * Get the connection name
   */
  getName(): string | null {
    return this.name;
  }

  /**
   * Set the connection name
   */
  setName(name: string): void {
    this.name = name;
  }

  /**
   * Begin a fluent query against a database table
   */
  table(table: string, as?: string): QueryBuilder {
    return this.query().from(table, as);
  }

  /**
   * Get a new query builder instance
   */
  query(): QueryBuilder {
    return new QueryBuilder(this, this.getQueryGrammar(), this.getPostProcessor());
  }

  /**
   * Get a new raw query expression
   */
  raw(value: any): Expression {
    return new Expression(value);
  }

  /**
   * Run a select statement and return a single result
   */
  async selectOne(query: string, bindings: any[] = [], useReadPdo = true): Promise<any> {
    const records = await this.select(query, bindings, useReadPdo);
    return records.shift() || null;
  }

  /**
   * Run a select statement against the database
   */
  abstract select(query: string, bindings?: any[], useReadPdo?: boolean): Promise<any[]>;

  /**
   * Run a select statement and return the first column
   */
  async scalar(query: string, bindings: any[] = [], useReadPdo = true): Promise<any> {
    const record = await this.selectOne(query, bindings, useReadPdo);
    if (!record) return null;
    
    const values = Object.values(record);
    return values[0] ?? null;
  }

  /**
   * Run an insert statement against the database
   */
  abstract insert(query: string, bindings?: any[]): Promise<boolean>;

  /**
   * Run an update statement against the database
   */
  abstract update(query: string, bindings?: any[]): Promise<number>;

  /**
   * Run a delete statement against the database
   */
  abstract delete(query: string, bindings?: any[]): Promise<number>;

  /**
   * Execute an SQL statement and return the boolean result
   */
  abstract statement(query: string, bindings?: any[]): Promise<boolean>;

  /**
   * Run an SQL statement and get the number of rows affected
   */
  abstract affectingStatement(query: string, bindings?: any[]): Promise<number>;

  /**
   * Run a raw, unprepared query against the database
   */
  abstract unprepared(query: string): Promise<boolean>;

  /**
   * Start a new database transaction
   */
  async beginTransaction(): Promise<void> {
    await this.createTransaction();
    this.transactions += 1;
  }

  /**
   * Create a transaction within the database
   */
  protected abstract createTransaction(): Promise<void>;

  /**
   * Commit the active database transaction
   */
  async commit(): Promise<void> {
    if (this.transactions === 1) {
      await this.performCommit();
    }
    this.transactions = Math.max(0, this.transactions - 1);
  }

  /**
   * Perform a commit on the database
   */
  protected abstract performCommit(): Promise<void>;

  /**
   * Rollback the active database transaction
   */
  async rollback(toLevel: number | null = null): Promise<void> {
    const level = toLevel ?? this.transactions - 1;
    if (level < 0 || level >= this.transactions) {
      return;
    }

    await this.performRollBack(level);
    this.transactions = level;
  }

  /**
   * Perform a rollback on the database
   */
  protected abstract performRollBack(toLevel: number): Promise<void>;

  /**
   * Get the number of active transactions
   */
  transactionLevel(): number {
    return this.transactions;
  }

  /**
   * Execute a Closure within a transaction
   */
  async transaction<T>(callback: () => Promise<T>, attempts = 1): Promise<T> {
    for (let currentAttempt = 1; currentAttempt <= attempts; currentAttempt += 1) {
      await this.beginTransaction();

      try {
        const result = await callback();
        await this.commit();
        return result;
      } catch (error) {
        await this.rollback();

        if (currentAttempt === attempts) {
          throw error;
        }
      }
    }

    throw new Error('Transaction failed after maximum attempts');
  }

  /**
   * Get the database connection configuration
   */
  getConfig(option?: string): any {
    if (option) {
      return this.config[option as keyof ConnectionConfig];
    }
    return this.config;
  }

  /**
   * Get the query grammar used by the connection
   */
  getQueryGrammar(): any {
    return this.queryGrammar;
  }

  /**
   * Set the query grammar used by the connection
   */
  setQueryGrammar(grammar: any): void {
    this.queryGrammar = grammar;
  }

  /**
   * Get the schema grammar used by the connection
   */
  getSchemaGrammar(): any {
    return this.schemaGrammar;
  }

  /**
   * Set the schema grammar used by the connection
   */
  setSchemaGrammar(grammar: any): void {
    this.schemaGrammar = grammar;
  }

  /**
   * Get the query post processor used by the connection
   */
  getPostProcessor(): any {
    return this.postProcessor;
  }

  /**
   * Set the query post processor used by the connection
   */
  setPostProcessor(processor: any): void {
    this.postProcessor = processor;
  }

  /**
   * Get the schema builder instance
   */
  getSchemaBuilder(): SchemaBuilder {
    if (!this.schemaGrammar) {
      this.useDefaultSchemaGrammar();
    }
    return new SchemaBuilder(this);
  }

  /**
   * Get the table prefix for the connection
   */
  getTablePrefix(): string {
    return this.tablePrefix;
  }

  /**
   * Set the table prefix
   */
  setTablePrefix(prefix: string): void {
    this.tablePrefix = prefix;
    this.getQueryGrammar()?.setTablePrefix(prefix);
  }

  /**
   * Set the query grammar to the default implementation
   */
  protected abstract useDefaultQueryGrammar(): void;

  /**
   * Set the schema grammar to the default implementation
   */
  protected abstract useDefaultSchemaGrammar(): void;

  /**
   * Set the query post processor to the default implementation
   */
  protected abstract useDefaultPostProcessor(): void;

  /**
   * Disconnect from the underlying database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Reconnect to the database
   */
  async reconnect(): Promise<void> {
    if (this.reconnector) {
      await this.reconnector();
    } else {
      throw new Error('No reconnector configured for connection');
    }
  }

  /**
   * Set the reconnect instance on the connection
   */
  setReconnector(reconnector: () => Promise<void>): void {
    this.reconnector = reconnector;
  }

  /**
   * Get the database connection name
   */
  getDatabaseName(): string {
    return this.config.database;
  }

  /**
   * Set the database connection name
   */
  setDatabaseName(database: string): void {
    this.config.database = database;
  }

  /**
   * Determine if the connection is in a dry run
   */
  pretending(): boolean {
    return this.pretend;
  }

  /**
   * Log a query in the connection's query log
   */
  logQuery(query: string, bindings: any[], time: number): void {
    if (this.loggingQueries) {
      this.queryLog.push({ query, bindings, time });
    }
  }

  /**
   * Get the connection query log
   */
  getQueryLog(): Array<{ query: string; bindings: any[]; time: number }> {
    return this.queryLog;
  }

  /**
   * Clear the query log
   */
  flushQueryLog(): void {
    this.queryLog = [];
  }

  /**
   * Enable the query log on the connection
   */
  enableQueryLog(): void {
    this.loggingQueries = true;
  }

  /**
   * Disable the query log on the connection
   */
  disableQueryLog(): void {
    this.loggingQueries = false;
  }

  /**
   * Determine whether we're logging queries
   */
  logging(): boolean {
    return this.loggingQueries;
  }

  /**
   * Get the name of the connected database driver
   */
  abstract getDriverName(): string;

  /**
   * Get the underlying client connection
   */
  getClient(): any {
    return this.client;
  }

  /**
   * Get the underlying read client connection
   */
  getReadClient(): any {
    return this.readClient || this.client;
  }
}
