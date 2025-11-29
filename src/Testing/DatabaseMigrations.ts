import { Connection } from '../Connection/Connection';
import { Migrator } from '../Migrations/Migrator';

/**
 * DatabaseMigrations trait equivalent for testing
 * Runs migrations before tests and cleans up after
 */
export class DatabaseMigrations {
  protected connection?: Connection;
  protected migrator?: Migrator;
  protected ranMigrations: boolean = false;

  /**
   * Set the connection and migrator
   */
  setConnection(connection: Connection, migrator: Migrator): void {
    this.connection = connection;
    this.migrator = migrator;
  }

  /**
   * Run migrations before tests
   */
  async runDatabaseMigrations(): Promise<void> {
    if (!this.connection || !this.migrator) {
      throw new Error('Connection and Migrator must be set before running migrations');
    }

    if (!this.ranMigrations) {
      await this.migrator.run();
      this.ranMigrations = true;
    }
  }

  /**
   * Rollback migrations after tests
   */
  async rollbackDatabaseMigrations(): Promise<void> {
    if (!this.migrator) {
      throw new Error('Migrator not set');
    }

    if (this.ranMigrations) {
      await this.migrator.reset();
      this.ranMigrations = false;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<any[]> {
    if (!this.migrator) {
      throw new Error('Migrator not set');
    }

    return await this.migrator.status();
  }
}

/**
 * Helper function to create a DatabaseMigrations instance
 */
export function createDatabaseMigrations(connection: Connection, migrator: Migrator): DatabaseMigrations {
  const migrations = new DatabaseMigrations();
  migrations.setConnection(connection, migrator);
  return migrations;
}
