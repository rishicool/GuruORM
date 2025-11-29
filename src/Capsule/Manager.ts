import { ConnectionManager } from '../Connection/ConnectionManager';
import { ConnectionConfig } from '../Connection/ConnectionInterface';
import { ConnectionInterface } from '../Connection/ConnectionInterface';

/**
 * Capsule Manager - inspired by Laravel's Capsule Manager
 * Provides a simple way to use the database outside of a full framework
 */
export class Manager {
  protected manager: ConnectionManager;
  protected connections: Map<string, ConnectionConfig> = new Map();
  protected static instance: Manager | null = null;

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
    }
  }

  /**
   * Get a database connection instance
   */
  connection(name?: string): ConnectionInterface {
    return this.manager.connection(name);
  }

  /**
   * Get a registered connection instance
   */
  getConnection(name?: string): ConnectionInterface {
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
    // Eloquent bootstrapping will be implemented when Model class is ready
    console.log('Eloquent ORM bootstrapped');
  }

  /**
   * Get the database manager instance
   */
  getDatabaseManager(): ConnectionManager {
    return this.manager;
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
  static async transaction<T>(callback: () => Promise<T>, connection?: string): Promise<T> {
    return Manager.getInstance()
      .getConnection(connection)
      .transaction(callback);
  }
}
