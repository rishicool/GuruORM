import { ConnectionInterface } from './ConnectionInterface';

/**
 * Connection Resolver Interface - inspired by Laravel and Illuminate
 */
export interface ConnectionResolverInterface {
  /**
   * Get a database connection instance
   */
  connection(name?: string | null): ConnectionInterface;

  /**
   * Get the default connection name
   */
  getDefaultConnection(): string;

  /**
   * Set the default connection name
   */
  setDefaultConnection(name: string): void;
}

/**
 * Connection Resolver - manages database connections
 */
export class ConnectionResolver implements ConnectionResolverInterface {
  protected connections: Map<string, ConnectionInterface> = new Map();
  protected defaultConnection = 'default';

  /**
   * Get a database connection instance
   */
  connection(name: string | null = null): ConnectionInterface {
    const connectionName = name || this.defaultConnection;
    const conn = this.connections.get(connectionName);

    if (!conn) {
      throw new Error(`Database connection [${connectionName}] not configured.`);
    }

    return conn;
  }

  /**
   * Add a connection to the resolver
   */
  addConnection(name: string, connection: ConnectionInterface): void {
    this.connections.set(name, connection);
  }

  /**
   * Check if a connection exists
   */
  hasConnection(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * Get the default connection name
   */
  getDefaultConnection(): string {
    return this.defaultConnection;
  }

  /**
   * Set the default connection name
   */
  setDefaultConnection(name: string): void {
    this.defaultConnection = name;
  }

  /**
   * Get all connections
   */
  getConnections(): Map<string, ConnectionInterface> {
    return this.connections;
  }
}
