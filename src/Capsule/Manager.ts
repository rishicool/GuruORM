import { ConnectionManager } from '../Connection/ConnectionManager';
import { ConnectionConfig } from '../Connection/ConnectionInterface';
import { ConnectionInterface } from '../Connection/ConnectionInterface';

/**
 * Capsule Manager - inspired by Laravel and Illuminate
 * Provides a simple way to use the database outside of a full framework
 */
export class Manager {
  protected manager: ConnectionManager;
  protected connections: Map<string, ConnectionConfig> = new Map();
  protected static instance: Manager | null = null;
  /** Cached default connection — avoids Map lookup on every query */
  private _defaultConn: ConnectionInterface | null = null;

  constructor() {
    this.manager = new ConnectionManager();
    this.setupDefaultConfiguration();
  }

  /**
   * Setup the default database configuration
   */
  protected setupDefaultConfiguration(): void {
    // Default configuration can be set here
  }

  /**
   * Make this capsule instance available globally
   */
  setAsGlobal(): void {
    Manager.instance = this;
  }

  /**
   * Get the global capsule instance
   */
  static getInstance(): Manager {
    if (!Manager.instance) {
      throw new Error('Capsule not set as global. Call setAsGlobal() first.');
    }
    return Manager.instance;
  }

  /**
   * Add a database connection configuration
   */
  addConnection(config: ConnectionConfig, name = 'default'): void {
    this.connections.set(name, config);
    this.manager.addConnection(name, config);

    if (name === 'default') {
      this.manager.setDefaultConnection(name);
      
      // Auto-bootstrap Eloquent when default connection is added
      if (this.connections.size === 1) {
        this.bootEloquent();
      }
    }
  }

  /**
   * Get a database connection instance
   */
  connection(name?: string): ConnectionInterface {
    return this.manager.connection(name);
  }

  /**
   * Get a registered connection instance.
   * Hot path — cached for default connection.
   */
  getConnection(name?: string): ConnectionInterface {
    if (!name || name === 'default') {
      if (this._defaultConn) return this._defaultConn;
      const conn = this.manager.connection(name);
      this._defaultConn = conn;
      return conn;
    }
    return this.manager.connection(name);
  }

  /**
   * Set the default connection name
   */
  setDefaultConnection(name: string): void {
    this.manager.setDefaultConnection(name);
  }

  /**
   * Get the default connection name
   */
  getDefaultConnection(): string {
    return this.manager.getDefaultConnection();
  }

  /**
   * Bootstrap Eloquent ORM
   */
  bootEloquent(): void {
    const Model = require('../Eloquent/Model').Model;
    
    // Set up the connection resolver for Model
    Model.setConnectionResolver({
      connection: (name?: string) => {
        return this.getConnection(name);
      }
    });
  }

  /**
   * Get the database manager instance
   */
  getDatabaseManager(): ConnectionManager {
    return this.manager;
  }

  /**
   * Begin a fluent query against a database table (instance method).
   * Hot path — uses cached connection for default.
   */
  table(table: string, as?: string, connection?: string): any {
    const conn = (!connection || connection === 'default') && this._defaultConn
      ? this._defaultConn
      : this.getConnection(connection);
    return conn.table(table, as);
  }

  /**
   * Get a schema builder instance (instance method)
   */
  schema(connection?: string): any {
    return this.getConnection(connection).getSchemaBuilder();
  }

  /**
   * Run a select statement (instance method).
   * Hot path — skips getConnection overhead for default.
   */
  async select(query: string, bindings: any[] = [], connection?: string): Promise<any[]> {
    const conn = (!connection || connection === 'default') && this._defaultConn
      ? this._defaultConn
      : this.getConnection(connection);
    return conn.select(query, bindings);
  }

  /**
   * Run an insert statement (instance method)
   */
  async insert(query: string, bindings: any[] = [], connection?: string): Promise<boolean> {
    return this.getConnection(connection).insert(query, bindings);
  }

  /**
   * Run an update statement (instance method)
   */
  async update(query: string, bindings: any[] = [], connection?: string): Promise<number> {
    return this.getConnection(connection).update(query, bindings);
  }

  /**
   * Run a delete statement (instance method)
   */
  async delete(query: string, bindings: any[] = [], connection?: string): Promise<number> {
    return this.getConnection(connection).delete(query, bindings);
  }

  /**
   * Execute a statement (instance method)
   */
  async statement(query: string, bindings: any[] = [], connection?: string): Promise<boolean> {
    return this.getConnection(connection).statement(query, bindings);
  }

  /**
   * Begin a transaction (instance method)
   */
  async transaction<T>(callback: (trx: any) => Promise<T>, connection?: string): Promise<T> {
    const conn = this.getConnection(connection);
    return conn.transaction(async () => {
      return callback(conn);
    });
  }

  /**
   * Disconnect from all databases (instance method)
   */
  async disconnect(name?: string): Promise<void> {
    if (name) {
      await this.getConnection(name).disconnect();
    } else {
      // Disconnect all connections
      for (const [connectionName] of this.connections) {
        await this.getConnection(connectionName).disconnect();
      }
    }
  }

  /**
   * Begin a database transaction
   */
  async beginTransaction(connection?: string): Promise<void> {
    return this.getConnection(connection).beginTransaction();
  }

  /**
   * Commit the active database transaction
   */
  async commit(connection?: string): Promise<void> {
    return this.getConnection(connection).commit();
  }

  /**
   * Rollback the active database transaction
   */
  async rollback(connection?: string): Promise<void> {
    return this.getConnection(connection).rollback();
  }

  /**
   * Register a query event listener
   */
  listen(listener: (query: any) => void): void {
    const { QueryLogger } = require('../Support/QueryLogger');
    QueryLogger.listen(listener);
  }

  /**
   * Begin a fluent query against a database table (static method)
   */
  static table(table: string, as?: string, connection?: string): any {
    return Manager.getInstance()
      .getConnection(connection)
      .table(table, as);
  }

  /**
   * Get a schema builder instance (static method)
   */
  static schema(connection?: string): any {
    return Manager.getInstance()
      .getConnection(connection)
      .getSchemaBuilder();
  }

  /**
   * Run a select statement (static method)
   */
  static async select(query: string, bindings: any[] = [], connection?: string): Promise<any[]> {
    return Manager.getInstance()
      .getConnection(connection)
      .select(query, bindings);
  }

  /**
   * Run an insert statement (static method)
   */
  static async insert(query: string, bindings: any[] = [], connection?: string): Promise<boolean> {
    return Manager.getInstance()
      .getConnection(connection)
      .insert(query, bindings);
  }

  /**
   * Run an update statement (static method)
   */
  static async update(query: string, bindings: any[] = [], connection?: string): Promise<number> {
    return Manager.getInstance()
      .getConnection(connection)
      .update(query, bindings);
  }

  /**
   * Run a delete statement (static method)
   */
  static async delete(query: string, bindings: any[] = [], connection?: string): Promise<number> {
    return Manager.getInstance()
      .getConnection(connection)
      .delete(query, bindings);
  }

  /**
   * Execute a statement (static method)
   */
  static async statement(query: string, bindings: any[] = [], connection?: string): Promise<boolean> {
    return Manager.getInstance()
      .getConnection(connection)
      .statement(query, bindings);
  }

  /**
   * Begin a transaction (static method)
   */
  static async transaction<T>(callback: (trx: any) => Promise<T>, connection?: string): Promise<T> {
    return Manager.getInstance().transaction(callback, connection);
  }

  /**
   * Disconnect from all databases (static method)
   */
  static async disconnect(name?: string): Promise<void> {
    return Manager.getInstance().disconnect(name);
  }

  /**
   * Get a raw query expression (instance method)
   */
  raw(value: any, connection?: string): any {
    return this.getConnection(connection).raw(value);
  }

  /**
   * Get a raw query expression (static method).
   * Use for embedding raw SQL in query builder calls:
   *   DB.table('users').where('votes', '>', DB.raw('?', [100]))
   */
  static raw(value: any, connection?: string): any {
    return Manager.getInstance().raw(value, connection);
  }
}
