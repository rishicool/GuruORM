import { Connection } from '../Connection/Connection';
import { Migrator } from '../Migrations/Migrator';

/**
 * RefreshDatabase trait equivalent for testing
 * Refreshes the database before each test
 */
export class RefreshDatabase {
  protected connection?: Connection;
  protected migrator?: Migrator;
  protected migrated: boolean = false;

  /**
   * Set the connection and migrator
   */
  setConnection(connection: Connection, migrator: Migrator): void {
    this.connection = connection;
    this.migrator = migrator;
  }

  /**
   * Refresh the database before each test
   */
  async refreshDatabase(): Promise<void> {
    if (!this.connection || !this.migrator) {
      throw new Error('Connection and Migrator must be set before refreshing database');
    }

    await this.refreshTestDatabase();
  }

  /**
   * Refresh the test database
   */
  protected async refreshTestDatabase(): Promise<void> {
    if (!this.migrated) {
      await this.runMigrations();
      this.migrated = true;
    } else {
      await this.resetDatabase();
    }
  }

  /**
   * Run all migrations
   */
  protected async runMigrations(): Promise<void> {
    if (!this.migrator) {
      throw new Error('Migrator not set');
    }

    await this.migrator.run();
  }

  /**
   * Reset the database
   */
  protected async resetDatabase(): Promise<void> {
    if (!this.migrator) {
      throw new Error('Migrator not set');
    }

    await this.migrator.reset();
    await this.migrator.run();
  }

  /**
   * Begin a database transaction
   */
  async beginDatabaseTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not set');
    }

    await this.connection.beginTransaction();
  }

  /**
   * Rollback the database transaction
   */
  async rollbackDatabaseTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not set');
    }

    await this.connection.rollback();
  }
}

/**
 * Helper function to create a RefreshDatabase instance
 */
export function createRefreshDatabase(connection: Connection, migrator: Migrator): RefreshDatabase {
  const refresh = new RefreshDatabase();
  refresh.setConnection(connection, migrator);
  return refresh;
}
