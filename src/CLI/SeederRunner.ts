import * as path from 'path';
import { Manager } from '../Capsule/Manager';
import chalk from 'chalk';

/**
 * SeederRunner - Handles database seeding operations
 * Similar to Laravel's db:seed command
 */
export class SeederRunner {
  protected manager: Manager;
  protected seedersPath: string;

  constructor() {
    this.seedersPath = path.join(process.cwd(), 'database', 'seeders');
    
    // Initialize database connection
    this.manager = this.initializeManager();
  }

  /**
   * Initialize the database manager
   */
  protected initializeManager(): Manager {
    const configPath = path.join(process.cwd(), 'guruorm.config.js');
    
    try {
      // Try to load guruorm.config.js
      const config = require(configPath);
      const manager = new Manager();
      
      // Add all configured connections
      const connections = config.connections || { default: config };
      const defaultConnection = config.default || 'default';
      
      Object.entries(connections).forEach(([name, connConfig]: [string, any]) => {
        manager.addConnection(connConfig, name);
      });
      
      // Set default connection
      if (defaultConnection) {
        manager.setDefaultConnection(defaultConnection);
      }
      
      manager.bootEloquent();
      manager.setAsGlobal();
      
      return manager;
    } catch (error) {
      console.error(chalk.red('❌ Error loading guruorm.config.js'));
      console.log(chalk.yellow('   Make sure guruorm.config.js exists in your project root'));
      console.log('');
      throw error;
    }
  }

  /**
   * Run database seeders
   * 
   * @param options - Seeding options
   */
  async run(options: {
    class?: string;
    force?: boolean;
  } = {}): Promise<void> {
    const seederClass = options.class || 'DatabaseSeeder';
    
    console.log(chalk.blue(`🌱 Seeding database with ${seederClass}...`));
    console.log('');
    
    try {
      const seederPath = path.join(this.seedersPath, `${seederClass}.js`);
      const { default: SeederClass } = await import(seederPath);
      
      const seeder = new SeederClass();
      
      if (typeof seeder.run !== 'function') {
        throw new Error(`Seeder ${seederClass} must have a run() method`);
      }
      
      await seeder.run();
      
      console.log('');
      console.log(chalk.green(`✅ Database seeding completed successfully!`));
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND') {
        console.error(chalk.red(`❌ Seeder not found: ${seederClass}`));
        console.log(chalk.yellow(`   Expected path: database/seeders/${seederClass}.js`));
        console.log('');
        console.log(chalk.cyan(`   Create it with: guruorm make:seeder ${seederClass}`));
      } else {
        throw error;
      }
    }
  }

  /**
   * Truncate all tables and re-run seeders
   * Similar to Laravel's db:seed --refresh
   * 
   * @param options - Refresh options
   */
  async refresh(options: {
    class?: string;
    force?: boolean;
  } = {}): Promise<void> {
    console.log(chalk.yellow('🗑️  Truncating all tables...'));
    console.log('');
    
    try {
      // Get all tables
      const connection = this.manager.getConnection();
      const tables = await this.getAllTables(connection);
      
      // Disable foreign key checks
      await this.disableForeignKeyChecks(connection);
      
      // Truncate each table
      for (const table of tables) {
        // Skip migrations table
        if (table === 'migrations' || table === 'schema_migrations') {
          continue;
        }
        
        console.log(chalk.gray(`   Truncating: ${table}`));
        await connection.table(table).truncate();
      }
      
      // Re-enable foreign key checks
      await this.enableForeignKeyChecks(connection);
      
      console.log('');
      console.log(chalk.green('✅ All tables truncated successfully!'));
      console.log('');
      
      // Run seeders
      await this.run(options);
      
    } catch (error: any) {
      console.error(chalk.red('❌ Error during refresh:'), error.message);
      throw error;
    }
  }

  /**
   * Get all tables from database
   */
  protected async getAllTables(connection: any): Promise<string[]> {
    const driver = connection.getConfig().driver;
    
    let query: string;
    
    switch (driver) {
      case 'postgres':
        query = `
          SELECT tablename as table_name 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `;
        break;
        
      case 'mysql':
        query = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `;
        break;
        
      case 'sqlite':
        query = `
          SELECT name as table_name 
          FROM sqlite_master 
          WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%'
        `;
        break;
        
      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }
    
    const results = await connection.select(query);
    return results.map((row: any) => row.table_name || row.tablename);
  }

  /**
   * Disable foreign key checks
   */
  protected async disableForeignKeyChecks(connection: any): Promise<void> {
    const driver = connection.getConfig().driver;
    
    switch (driver) {
      case 'postgres':
        // PostgreSQL doesn't have a global setting, handle per table
        break;
        
      case 'mysql':
        await connection.statement('SET FOREIGN_KEY_CHECKS = 0');
        break;
        
      case 'sqlite':
        await connection.statement('PRAGMA foreign_keys = OFF');
        break;
    }
  }

  /**
   * Enable foreign key checks
   */
  protected async enableForeignKeyChecks(connection: any): Promise<void> {
    const driver = connection.getConfig().driver;
    
    switch (driver) {
      case 'postgres':
        // PostgreSQL doesn't have a global setting
        break;
        
      case 'mysql':
        await connection.statement('SET FOREIGN_KEY_CHECKS = 1');
        break;
        
      case 'sqlite':
        await connection.statement('PRAGMA foreign_keys = ON');
        break;
    }
  }

  /**
   * Clear all data from all tables (without dropping tables)
   * Similar to db:wipe but preserves structure
   */
  async clear(options: {
    force?: boolean;
  } = {}): Promise<void> {
    if (!options.force && process.env.NODE_ENV === 'production') {
      console.error(chalk.red('❌ Use --force to clear database in production'));
      process.exit(1);
    }
    
    console.log(chalk.yellow('🗑️  Clearing all tables...'));
    console.log('');
    
    try {
      const connection = this.manager.getConnection();
      const tables = await this.getAllTables(connection);
      
      await this.disableForeignKeyChecks(connection);
      
      for (const table of tables) {
        if (table === 'migrations' || table === 'schema_migrations') {
          continue;
        }
        
        console.log(chalk.gray(`   Clearing: ${table}`));
        await connection.table(table).delete();
      }
      
      await this.enableForeignKeyChecks(connection);
      
      console.log('');
      console.log(chalk.green('✅ All tables cleared successfully!'));
      
    } catch (error: any) {
      console.error(chalk.red('❌ Error clearing tables:'), error.message);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.manager.disconnect();
  }
}
