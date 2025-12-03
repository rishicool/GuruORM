import { Connection } from '../Connection/Connection';
import { Migration } from './Migration';
import { 
  dispatchMigrationsStarted, 
  dispatchMigrationsEnded, 
  dispatchMigrationStarted, 
  dispatchMigrationEnded,
  dispatchNoPendingMigrations 
} from './MigrationEvents';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migrator - handles running and rolling back migrations
 */
export class Migrator {
  protected connection: Connection;
  protected migrationTable = 'migrations';
  protected paths: string[] = [];

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Set the migration paths
   */
  setPaths(paths: string[]): this {
    this.paths = paths;
    return this;
  }

  /**
   * Add a migration path
   */
  addPath(path: string): this {
    this.paths.push(path);
    return this;
  }

  /**
   * Run pending migrations
   */
  async run(options: MigrationOptions = {}): Promise<MigrationResult[]> {
    await this.createMigrationTable();

    const files = this.getMigrationFiles();
    const ran = await this.getRanMigrations();
    const pending = files.filter(file => !ran.includes(file.name));

    if (pending.length === 0) {
      await dispatchNoPendingMigrations();
      return [];
    }

    await dispatchMigrationsStarted('up');
    
    const results: MigrationResult[] = [];
    const batch = await this.getNextBatchNumber();

    for (const migration of pending) {
      const result = await this.runMigration(migration, batch, options);
      results.push(result);
    }

    await dispatchMigrationsEnded('up');

    return results;
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollback(options: MigrationOptions = {}): Promise<MigrationResult[]> {
    const lastBatch = await this.getLastBatchNumber();
    
    if (lastBatch === 0) {
      return [];
    }

    await dispatchMigrationsStarted('down');

    const migrations = await this.getMigrationsForBatch(lastBatch);
    const results: MigrationResult[] = [];

    // Rollback in reverse order
    for (const migration of migrations.reverse()) {
      const result = await this.rollbackMigration(migration, options);
      results.push(result);
    }

    await dispatchMigrationsEnded('down');

    return results;
  }

  /**
   * Reset all migrations
   */
  async reset(options: MigrationOptions = {}): Promise<MigrationResult[]> {
    await this.createMigrationTable();

    const migrations = await this.getAllRanMigrations();
    const results: MigrationResult[] = [];

    // Rollback in reverse order
    for (const migration of migrations.reverse()) {
      const result = await this.rollbackMigration(migration, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Get migration status
   */
  async status(): Promise<MigrationStatus[]> {
    await this.createMigrationTable();

    const files = this.getMigrationFiles();
    const ran = await this.getRanMigrations();
    const statuses: MigrationStatus[] = [];

    for (const file of files) {
      statuses.push({
        name: file.name,
        ran: ran.includes(file.name),
        batch: await this.getBatchForMigration(file.name)
      });
    }

    return statuses;
  }

  /**
   * Run a single migration
   */
  protected async runMigration(
    migrationFile: MigrationFile,
    batch: number,
    options: MigrationOptions
  ): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      await dispatchMigrationStarted(migrationFile.name, batch);
      const migration = await this.loadMigration(migrationFile);

      if (options.pretend) {
        console.log(`Would run: ${migrationFile.name}`);
        await dispatchMigrationEnded(migrationFile.name, batch, 'up');
        return {
          name: migrationFile.name,
          success: true,
          time: 0,
          pretend: true
        };
      }

      // Wrap migration in transaction for atomicity
      await this.connection.transaction(async () => {
        await migration.up();
        await this.logMigration(migrationFile.name, batch);
      });

      const time = Date.now() - startTime;
      await dispatchMigrationEnded(migrationFile.name, batch, 'up');
      return {
        name: migrationFile.name,
        success: true,
        time
      };
    } catch (error: any) {
      return {
        name: migrationFile.name,
        success: false,
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  /**
   * Rollback a single migration
   */
  protected async rollbackMigration(
    migrationRecord: MigrationRecord,
    options: MigrationOptions
  ): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      await dispatchMigrationStarted(migrationRecord.migration, migrationRecord.batch);
      const files = this.getMigrationFiles();
      const file = files.find(f => f.name === migrationRecord.migration);

      if (!file) {
        throw new Error(`Migration file not found: ${migrationRecord.migration}`);
      }

      const migration = await this.loadMigration(file);

      if (options.pretend) {
        console.log(`Would rollback: ${migrationRecord.migration}`);
        return {
          name: migrationRecord.migration,
          success: true,
          time: 0,
          pretend: true
        };
      }

      // Wrap rollback in transaction for atomicity
      await this.connection.transaction(async () => {
        await migration.down();
        await this.removeMigrationLog(migrationRecord.migration);
      });

      const time = Date.now() - startTime;
      return {
        name: migrationRecord.migration,
        success: true,
        time
      };
    } catch (error: any) {
      return {
        name: migrationRecord.migration,
        success: false,
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  /**
   * Load a migration instance
   */
  /**
   * Load a migration file and return migration instance
   */
  protected async loadMigration(file: MigrationFile): Promise<Migration> {
    let migrationModule;
    
    // Try to load the migration file - support both ESM and CJS
    try {
      // First, try require for CJS files
      if (require.cache[file.path]) {
        delete require.cache[file.path];
      }
      
      try {
        migrationModule = require(file.path);
      } catch (requireError: any) {
        // If require fails, try dynamic import for ESM
        // Convert absolute path to file:// URL for ESM import
        const fileUrl = new URL(file.path, 'file://').href;
        
        try {
          migrationModule = await import(fileUrl);
        } catch (importError: any) {
          // If both fail, throw detailed error
          throw new Error(
            `Failed to load migration ${file.name}:\n` +
            `  CJS Error: ${requireError.message}\n` +
            `  ESM Error: ${importError.message}`
          );
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to load migration ${file.name}: ${error.message}`);
    }
    
    // Support multiple export formats
    // 1. ESM default export: export default class
    // 2. ESM function exports: export async function up/down
    // 3. CommonJS class: module.exports = class
    // 4. Named exports: export class Migration
    
    if (migrationModule.default) {
      // ESM default export or CJS with default wrapper
      const MigrationClass = migrationModule.default;
      
      if (typeof MigrationClass === 'function') {
        // It's a class constructor
        return new (MigrationClass as any)();
      } else if (MigrationClass.up && MigrationClass.down) {
        // It's already an object with up/down methods
        return MigrationClass as Migration;
      } else {
        throw new Error(`Invalid migration format in ${file.name}: default export must be a class or object with up/down methods`);
      }
    } else if (migrationModule.up && migrationModule.down) {
      // ESM function exports - wrap them
      return {
        up: async () => await migrationModule.up(),
        down: async () => await migrationModule.down()
      } as Migration;
    } else if (typeof migrationModule === 'function') {
      // Direct function export (CJS: module.exports = ClassName)
      return new (migrationModule as any)();
    } else {
      // Try to find a class in named exports
      const exportedValues = Object.values(migrationModule);
      const MigrationClass = exportedValues.find(val => typeof val === 'function');
      
      if (MigrationClass) {
        return new (MigrationClass as any)();
      }
      
      throw new Error(
        `Invalid migration format in ${file.name}. Expected:\n` +
        `  - CJS: module.exports = class { up() {} down() {} }\n` +
        `  - ESM: export default class { up() {} down() {} }\n` +
        `  - ESM: export async function up() {} export async function down() {}`
      );
    }
  }
  /**
   * Create the migration table if it doesn't exist
   */
  protected async createMigrationTable(): Promise<void> {
    const driverName = this.connection.getDriverName();
    const schema = this.connection.getSchemaBuilder();
    
    const hasTable = await schema.hasTable(this.migrationTable);
    
    if (!hasTable) {
      // Create table using Schema Builder for database compatibility
      await schema.create(this.migrationTable, (table: any) => {
        table.increments('id');
        table.string('migration');
        table.integer('batch');
      });
    }
  }

  /**
   * Log a migration
   */
  protected async logMigration(name: string, batch: number): Promise<void> {
    await this.connection.table(this.migrationTable).insert({
      migration: name,
      batch
    });
  }

  /**
   * Remove a migration log
   */
  protected async removeMigrationLog(name: string): Promise<void> {
    await this.connection.table(this.migrationTable)
      .where('migration', name)
      .delete();
  }

  /**
   * Get all migration files
   */
  protected getMigrationFiles(): MigrationFile[] {
    const files: MigrationFile[] = [];

    for (const migrationPath of this.paths) {
      if (!fs.existsSync(migrationPath)) {
        continue;
      }

      const dirFiles = fs.readdirSync(migrationPath);

      for (const file of dirFiles) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          files.push({
            name: file.replace(/\.(ts|js)$/, ''),
            path: path.join(migrationPath, file)
          });
        }
      }
    }

    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get ran migration names
   */
  protected async getRanMigrations(): Promise<string[]> {
    const results = await this.connection.table(this.migrationTable)
      .orderBy('batch')
      .orderBy('migration')
      .get();

    return results.map((r: any) => r.migration);
  }

  /**
   * Get all ran migrations with details
   */
  protected async getAllRanMigrations(): Promise<MigrationRecord[]> {
    return await this.connection.table(this.migrationTable)
      .orderBy('batch')
      .orderBy('migration')
      .get();
  }

  /**
   * Get migrations for a specific batch
   */
  protected async getMigrationsForBatch(batch: number): Promise<MigrationRecord[]> {
    return await this.connection.table(this.migrationTable)
      .where('batch', batch)
      .orderBy('migration')
      .get();
  }

  /**
   * Get the next batch number
   */
  protected async getNextBatchNumber(): Promise<number> {
    const result: any = await this.connection.table(this.migrationTable)
      .selectRaw('MAX(batch) as max_batch')
      .first();

    const maxBatch = result?.max_batch;
    return (maxBatch || 0) + 1;
  }

  /**
   * Get the last batch number
   */
  protected async getLastBatchNumber(): Promise<number> {
    const result: any = await this.connection.table(this.migrationTable)
      .selectRaw('MAX(batch) as max_batch')
      .first();

    const maxBatch = result?.max_batch;
    return maxBatch || 0;
  }

  /**
   * Get batch number for a migration
   */
  protected async getBatchForMigration(name: string): Promise<number | null> {
    const result = await this.connection.table(this.migrationTable)
      .where('migration', name)
      .first();

    return result?.batch || null;
  }
}

export interface MigrationOptions {
  pretend?: boolean;
  step?: number;
}

export interface MigrationFile {
  name: string;
  path: string;
}

export interface MigrationRecord {
  id: number;
  migration: string;
  batch: number;
}

export interface MigrationResult {
  name: string;
  success: boolean;
  time: number;
  error?: string;
  pretend?: boolean;
}

export interface MigrationStatus {
  name: string;
  ran: boolean;
  batch: number | null;
}
