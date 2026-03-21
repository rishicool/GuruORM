import { Migrator } from '../Migrations/Migrator';
import { Manager as Capsule } from '../Capsule/Manager';
import * as path from 'path';
import * as fs from 'fs';
import { getRequire } from '../Support/compat.js';

/**
 * Migration Runner - handles CLI migration commands
 */
export class MigrationRunner {
  protected capsule: Capsule;
  protected migrator: Migrator;
  protected migrationsPath: string;
  protected config: any;

  constructor() {
    this.config = this.loadConfig();
    this.migrationsPath = this.getMigrationsPath();
    this.capsule = this.loadConnection();
    this.migrator = new Migrator(this.capsule.connection() as any);
    this.migrator.addPath(this.migrationsPath);
  }

  /**
   * Load guruorm.config.js if exists
   */
  protected loadConfig(): any {
    const cjsConfigPath = path.join(process.cwd(), 'guruorm.config.cjs');
    const jsConfigPath = path.join(process.cwd(), 'guruorm.config.js');
    const configPath = fs.existsSync(cjsConfigPath) ? cjsConfigPath : jsConfigPath;
    if (fs.existsSync(configPath)) {
      return getRequire()(configPath);
    }
    return null;
  }

  /**
   * Get migrations path from config or use default
   */
  protected getMigrationsPath(): string {
    if (this.config && this.config.migrations && this.config.migrations.path) {
      const configPath = this.config.migrations.path;
      return path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
    }
    return path.join(process.cwd(), 'database', 'migrations');
  }

  /**
   * Load database connection from config
   */
  protected loadConnection(): Capsule {
    const capsule = new Capsule();
    
    if (this.config) {
      const config = this.config;
      if (config.connections && config.default) {
        const connectionName = config.default;
        const connectionConfig = config.connections[connectionName];
        if (connectionConfig) {
          capsule.addConnection(connectionConfig);
        } else {
          throw new Error(`Connection [${connectionName}] not found in config`);
        }
      } else if (config.default) {
        // Direct config object in 'default' key
        capsule.addConnection(config.default);
      } else {
        // Whole config is the connection
        capsule.addConnection(config);
      }
    } else {
      // Load from environment variables
      const driver = (process.env.DB_DRIVER || 'mysql') as 'mysql' | 'pgsql' | 'sqlite' | 'sqlserver';
      capsule.addConnection({
        driver,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_DATABASE || 'database',
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
      });
    }
    
    capsule.setAsGlobal();
    return capsule;
  }

  /**
   * Run pending migrations
   */
  async run(options: { force?: boolean; step?: number; pretend?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 Running migrations...\n');
      
      const results = await this.migrator.run({
        pretend: options.pretend,
        step: options.step
      });

      if (results.length === 0) {
        console.log('✅ Nothing to migrate\n');
        return;
      }

      for (const result of results) {
        if (result.success) {
          console.log(`✅ Migrated: ${result.name} (${result.time}ms)`);
        } else {
          console.log(`❌ Failed: ${result.name} - ${result.error}`);
        }
      }

      console.log(`\n✨ Migration completed! (${results.length} migration${results.length > 1 ? 's' : ''})\n`);
    } catch (error: any) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      await this.capsule.disconnect();
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(options: { step?: number; force?: boolean; pretend?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 Rolling back migrations...\n');
      
      const results = await this.migrator.rollback({
        pretend: options.pretend,
        step: options.step
      });

      if (results.length === 0) {
        console.log('✅ Nothing to rollback\n');
        return;
      }

      for (const result of results) {
        if (result.success) {
          console.log(`✅ Rolled back: ${result.name} (${result.time}ms)`);
        } else {
          console.log(`❌ Failed: ${result.name} - ${result.error}`);
        }
      }

      console.log(`\n✨ Rollback completed! (${results.length} migration${results.length > 1 ? 's' : ''})\n`);
    } catch (error: any) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    } finally {
      await this.capsule.disconnect();
    }
  }

  /**
   * Reset all migrations
   */
  async reset(options: { force?: boolean; pretend?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 Resetting database...\n');
      
      const results = await this.migrator.reset({
        pretend: options.pretend
      });

      if (results.length === 0) {
        console.log('✅ Nothing to reset\n');
        return;
      }

      for (const result of results) {
        if (result.success) {
          console.log(`✅ Rolled back: ${result.name} (${result.time}ms)`);
        } else {
          console.log(`❌ Failed: ${result.name} - ${result.error}`);
        }
      }

      console.log(`\n✨ Reset completed! (${results.length} migration${results.length > 1 ? 's' : ''})\n`);
    } catch (error: any) {
      console.error('❌ Reset failed:', error.message);
      throw error;
    } finally {
      await this.capsule.disconnect();
    }
  }

  /**
   * Fresh migration (drop all tables and re-migrate)
   */
  async fresh(options: { seed?: boolean; force?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 Dropping all tables and refreshing database...\n');
      
      await this.loadConnection();
      
      // Reset all migrations
      const resetResults = await this.migrator.reset();
      
      if (resetResults.length > 0) {
        for (const result of resetResults) {
          console.log(`✅ Rolled back: ${result.name} (${result.time}ms)`);
        }
        console.log('');
      } else {
        console.log('Nothing to reset\n');
      }
      
      // Run all migrations
      const runResults = await this.migrator.run();
      
      if (runResults.length > 0) {
        for (const result of runResults) {
          console.log(`✅ Migrated: ${result.name} (${result.time}ms)`);
        }
        console.log('');
      }
      
      // Optionally seed
      if (options.seed) {
        console.log('🌱 Seeding database...');
        // TODO: Run seeder
      }
      
      console.log(`✨ Fresh migration completed! (${runResults.length} migration${runResults.length > 1 ? 's' : ''})\n`);
    } catch (error: any) {
      console.error('❌ Fresh migration failed:', error.message);
      throw error;
    } finally {
      await this.capsule.disconnect();
    }
  }

  /**
   * Refresh migrations (reset and re-run)
   */
  async refresh(options: { seed?: boolean; step?: number; force?: boolean } = {}): Promise<void> {
    try {
      console.log('🔄 Resetting and re-running migrations...\n');
      
      await this.loadConnection();
      
      // Reset all migrations
      const resetResults = await this.migrator.reset();
      
      if (resetResults.length > 0) {
        for (const result of resetResults) {
          console.log(`✅ Rolled back: ${result.name} (${result.time}ms)`);
        }
        console.log('');
      } else {
        console.log('Nothing to reset\n');
      }
      
      // Run all migrations
      const runResults = await this.migrator.run();
      
      if (runResults.length > 0) {
        for (const result of runResults) {
          console.log(`✅ Migrated: ${result.name} (${result.time}ms)`);
        }
        console.log('');
      }
      
      // Optionally seed
      if (options.seed) {
        console.log('🌱 Seeding database...');
        // TODO: Run seeder
      }
      
      console.log(`✨ Refresh completed! (${runResults.length} migration${runResults.length > 1 ? 's' : ''})\n`);
    } catch (error: any) {
      console.error('❌ Refresh failed:', error.message);
      throw error;
    } finally {
      await this.capsule.disconnect();
    }
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    try {
      const statuses = await this.migrator.status();

      if (statuses.length === 0) {
        console.log('No migrations found.\n');
        return;
      }

      console.log('\n┌─────────────────────────────────────────────────────────────┬─────────┬─────────┐');
      console.log('│ Migration                                                   │ Batch   │ Status  │');
      console.log('├─────────────────────────────────────────────────────────────┼─────────┼─────────┤');

      for (const status of statuses) {
        const name = status.name.padEnd(59, ' ');
        const batch = status.batch !== null ? String(status.batch).padStart(7, ' ') : '   -   ';
        const statusText = status.ran ? '   ✅   ' : '   ❌   ';
        console.log(`│ ${name} │ ${batch} │ ${statusText} │`);
      }

      console.log('└─────────────────────────────────────────────────────────────┴─────────┴─────────┘\n');
    } catch (error: any) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    } finally {
      await this.capsule.disconnect();
    }
  }
}
