import { ConnectionInterface, ConnectionConfig } from './ConnectionInterface';
import { MySqlConnection } from './MySqlConnection';
import { PostgresConnection } from './PostgresConnection';
import { SqliteConnection } from './SqliteConnection';
import { SqlServerConnection } from './SqlServerConnection';
import { ConnectionResolver } from './ConnectionResolver';

/**
 * Database Connection Manager - inspired by Laravel's DatabaseManager
 * Manages multiple database connections
 */
export class ConnectionManager {
  protected connections: Map<string, ConnectionInterface> = new Map();
  protected resolver: ConnectionResolver;
  protected defaultConnection = 'default';

  constructor() {
    this.resolver = new ConnectionResolver();
  }

  /**
   * Get a database connection instance
   */
  connection(name?: string): ConnectionInterface {
    const connectionName = name || this.defaultConnection;
    
    if (!this.connections.has(connectionName)) {
      throw new Error(`Connection [${connectionName}] not configured.`);
    }

    return this.connections.get(connectionName)!;
  }

  /**
   * Add a new database connection
   */
  addConnection(name: string, config: ConnectionConfig): void {
    const connection = this.createConnection(config);
    connection.setName(name);
    this.connections.set(name, connection);
    this.resolver.addConnection(name, connection);
  }

  /**
   * Create a new connection instance based on configuration
   */
  protected createConnection(config: ConnectionConfig): ConnectionInterface {
    switch (config.driver) {
      case 'mysql':
        return new MySqlConnection(config);
      case 'pgsql':
        return new PostgresConnection(config) as any; // Placeholder
      case 'sqlite':
        return new SqliteConnection(config) as any; // Placeholder
      case 'sqlserver':
        return new SqlServerConnection(config) as any; // Placeholder
      default:
        throw new Error(`Unsupported driver [${config.driver}]`);
    }
  }

  /**
   * Set the default connection name
   */
  setDefaultConnection(name: string): void {
    this.defaultConnection = name;
    this.resolver.setDefaultConnection(name);
  }

  /**
   * Get the default connection name
   */
  getDefaultConnection(): string {
    return this.defaultConnection;
  }

  /**
   * Get the connection resolver
   */
  getResolver(): ConnectionResolver {
    return this.resolver;
  }

  /**
   * Begin a fluent query against a database table
   */
  static table(table: string, as?: string): any {
    // This will be properly implemented when we have a global instance
    throw new Error('DB.table() requires a configured connection. Use Capsule pattern instead.');
  }

  /**
   * Disconnect all database connections
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map((connection) =>
      connection.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.connections.clear();
  }
}
