/**
 * Database connection configuration interface
 */
export interface ConnectionConfig {
  driver: 'mysql' | 'postgres' | 'pgsql' | 'postgresql' | 'sqlite' | 'sqlite3' | 'sqlserver' | 'mssql';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  charset?: string;
  collation?: string;
  prefix?: string;
  timezone?: string;
  strict?: boolean;
  engine?: string | null;
  schema?: string;
  sslmode?: string;
  foreignKeyConstraints?: boolean;
  pool?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
  };
}

/**
 * Database connection interface - inspired by Laravel and Illuminate
 */
export interface ConnectionInterface {
  /**
   * Get the connection name.
   */
  getName(): string | null;

  /**
   * Set the connection name.
   */
  setName(name: string): void;

  /**
   * Begin a fluent query against a database table
   */
  table(table: string, as?: string): any;

  /**
   * Get a new raw query expression
   */
  raw(value: any): any;

  /**
   * Run a select statement and return a single result
   */
  selectOne(query: string, bindings?: any[], useReadPdo?: boolean): Promise<any>;

  /**
   * Run a select statement against the database
   */
  select(query: string, bindings?: any[], useReadPdo?: boolean): Promise<any[]>;

  /**
   * Run a select statement and return the first column
   */
  scalar(query: string, bindings?: any[], useReadPdo?: boolean): Promise<any>;

  /**
   * Run an insert statement against the database
   */
  insert(query: string, bindings?: any[]): Promise<boolean>;

  /**
   * Run an update statement against the database
   */
  update(query: string, bindings?: any[]): Promise<number>;

  /**
   * Run a delete statement against the database
   */
  delete(query: string, bindings?: any[]): Promise<number>;

  /**
   * Execute an SQL statement and return the boolean result
   */
  statement(query: string, bindings?: any[]): Promise<boolean>;

  /**
   * Run an SQL statement and get the number of rows affected
   */
  affectingStatement(query: string, bindings?: any[]): Promise<number>;

  /**
   * Run a raw, unprepared query against the database
   */
  unprepared(query: string): Promise<boolean>;

  /**
   * Start a new database transaction
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit the active database transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the active database transaction
   */
  rollback(toLevel?: number | null): Promise<void>;

  /**
   * Get the number of active transactions
   */
  transactionLevel(): number;

  /**
   * Execute a Closure within a transaction
   */
  transaction<T>(callback: () => Promise<T>, attempts?: number): Promise<T>;

  /**
   * Get the database connection configuration
   */
  getConfig(option?: string): any;

  /**
   * Get the query grammar used by the connection
   */
  getQueryGrammar(): any;

  /**
   * Get the schema grammar used by the connection
   */
  getSchemaGrammar(): any;

  /**
   * Get the schema builder instance
   */
  getSchemaBuilder(): any;

  /**
   * Get the table prefix for the connection
   */
  getTablePrefix(): string;

  /**
   * Set the table prefix
   */
  setTablePrefix(prefix: string): void;

  /**
   * Disconnect from the underlying database
   */
  disconnect(): Promise<void>;

  /**
   * Reconnect to the database
   */
  reconnect(): Promise<void>;

  /**
   * Get the database connection name
   */
  getDatabaseName(): string;

  /**
   * Set the database connection name
   */
  setDatabaseName(database: string): void;

  /**
   * Determine if the connection is in a dry run
   */
  pretending(): boolean;

  /**
   * Log a query in the connection's query log
   */
  logQuery(query: string, bindings: any[], time: number): void;

  /**
   * Get the connection query log
   */
  getQueryLog(): Array<{ query: string; bindings: any[]; time: number }>;

  /**
   * Clear the query log
   */
  flushQueryLog(): void;

  /**
   * Enable the query log on the connection
   */
  enableQueryLog(): void;

  /**
   * Disable the query log on the connection
   */
  disableQueryLog(): void;

  /**
   * Determine whether we're logging queries
   */
  logging(): boolean;

  /**
   * Get the name of the connected database
   */
  getDriverName(): string;
}
