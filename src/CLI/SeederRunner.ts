import * as path from 'path';
import * as fs from 'fs';
import { Manager } from '../Capsule/Manager';
import chalk from 'chalk';

/**
 * SeederRunner - Handles database seeding operations
 * Similar to Laravel's db:seed command
 */
export class SeederRunner {
  protected manager: Manager;
  protected seedersPath: string;
  protected seedersTable = 'seeders';

  constructor() {
    this.seedersPath = path.join(process.cwd(), 'database', 'seeders');
    
    // Initialize database connection
    this.manager = this.initializeManager();
  }

  /**
   * Initialize the database manager
   * Supports both .cjs and .js config files
   */
  protected initializeManager(): Manager {
    // Try .cjs first (for CommonJS in ES module projects)
    const cjsConfigPath = path.join(process.cwd(), 'guruorm.config.cjs');
    const jsConfigPath = path.join(process.cwd(), 'guruorm.config.js');
    
    let configPath: string;
    
    if (fs.existsSync(cjsConfigPath)) {
      configPath = cjsConfigPath;
    } else if (fs.existsSync(jsConfigPath)) {
      configPath = jsConfigPath;
    } else {
      console.error(chalk.red('❌ Error loading GuruORM config'));
      console.log(chalk.yellow('   Could not find guruorm.config.js or guruorm.config.cjs in your project root'));
      console.log('');
      throw new Error('GuruORM config file not found');
    }
    
    try {
      // Load config using require (works for both .cjs and .js in CommonJS context)
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
      console.error(chalk.red(`❌ Error loading ${path.basename(configPath)}`));
      console.log(chalk.yellow('   Make sure your config file is valid'));
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
    const seederClass = options.class;
    const force = options.force || false;
    
    // Create seeders tracking table
    await this.createSeedersTable();
    
    // If specific seeder class provided, run only that one
    if (seederClass) {
      console.log(chalk.blue(`🌱 Running seeder: ${seederClass}...`));
      console.log('');
      await this.runSingleSeeder(seederClass, force);
      return;
    }
    
    // Try DatabaseSeeder first
    const databaseSeederPath = path.join(this.seedersPath, 'DatabaseSeeder.js');
    if (fs.existsSync(databaseSeederPath)) {
      console.log(chalk.blue(`🌱 Seeding database with DatabaseSeeder...`));
      console.log('');
      await this.runSingleSeeder('DatabaseSeeder', force);
      return;
    }
    
    // If no DatabaseSeeder, run all seeders in the directory
    console.log(chalk.yellow('ℹ️  DatabaseSeeder not found. Running all seeders...'));
    console.log('');
    
    if (!fs.existsSync(this.seedersPath)) {
      console.log(chalk.yellow('⚠️  No seeders directory found at database/seeders/'));
      console.log(chalk.cyan('   Create a seeder with: guruorm make:seeder DatabaseSeeder'));
      console.log('');
      return;
    }
    
    const seederFiles = fs.readdirSync(this.seedersPath)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    if (seederFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No seeder files found in database/seeders/'));
      console.log(chalk.cyan('   Create a seeder with: guruorm make:seeder DatabaseSeeder'));
      console.log('');
      return;
    }
    
    console.log(chalk.blue(`Found ${seederFiles.length} seeder(s)`));
    console.log('');
    
    for (const file of seederFiles) {
      const seederName = file.replace('.js', '');
      await this.runSingleSeeder(seederName, force);
    }
  }
  
  /**
   * Run a single seeder by name
   */
  protected async runSingleSeeder(seederClass: string, force: boolean = false): Promise<void> {
    try {
      // Check if seeder has already been run (unless --force is specified)
      if (!force) {
        const hasRun = await this.hasSeederRun(seederClass);
        if (hasRun) {
          console.log(chalk.gray(`⏭️  Skipped: ${seederClass} (already run)`));
          return;
        }
      }
      
      const seederPath = path.join(this.seedersPath, `${seederClass}.js`);
      const { default: SeederClass } = await import(seederPath);
      
      const seeder = new SeederClass();
      
      if (typeof seeder.run !== 'function') {
        throw new Error(`Seeder ${seederClass} must have a run() method`);
      }
      
      // Pass force flag to seeder
      await seeder.run(force);
      
      // Log seeder execution
      await this.logSeeder(seederClass);
      
      console.log(chalk.green(`✅ Seeded: ${seederClass}`));
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND') {
        console.error(chalk.red(`❌ Seeder not found: ${seederClass}`));
        console.log(chalk.yellow(`   Expected path: database/seeders/${seederClass}.js`));
      } else {
        console.error(chalk.red(`❌ Error in ${seederClass}: ${error.message}`));
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
      case 'pgsql':
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
      case 'pgsql':
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
      case 'pgsql':
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
   * Create the seeders tracking table if it doesn't exist
   */
  protected async createSeedersTable(): Promise<void> {
    const connection = this.manager.getConnection();
    const schema = connection.getSchemaBuilder();
    
    const hasTable = await schema.hasTable(this.seedersTable);
    
    if (!hasTable) {
      await schema.create(this.seedersTable, (table: any) => {
        table.increments('id');
        table.string('seeder');
        table.integer('batch');
      });
    }
  }

  /**
   * Check if a seeder has already been run
   */
  protected async hasSeederRun(seederName: string): Promise<boolean> {
    const connection = this.manager.getConnection();
    const result = await connection
      .table(this.seedersTable)
      .where('seeder', seederName)
      .first();
    
    return !!result;
  }

  /**
   * Log a seeder execution
   */
  protected async logSeeder(seederName: string): Promise<void> {
    const connection = this.manager.getConnection();
    const batch = await this.getNextBatchNumber();
    
    await connection.table(this.seedersTable).insert({
      seeder: seederName,
      batch
    });
  }

  /**
   * Get the next batch number
   */
  protected async getNextBatchNumber(): Promise<number> {
    const connection = this.manager.getConnection();
    const results = await connection
      .table(this.seedersTable)
      .max('batch');
    
    // Handle different return formats
    let maxBatch = 0;
    if (Array.isArray(results) && results.length > 0) {
      maxBatch = results[0]?.max || results[0]?. ['max(batch)'] || 0;
    } else if (typeof results === 'object' && results !== null) {
      maxBatch = (results as any).max || (results as any)['max(batch)'] || 0;
    } else if (typeof results === 'number') {
      maxBatch = results;
    }
    
    return (maxBatch || 0) + 1;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.manager.disconnect();
  }
}
