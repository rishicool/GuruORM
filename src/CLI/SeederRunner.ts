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
   * Also migrates legacy seeder tables to the new format
   */
  protected async createSeedersTable(): Promise<void> {
    const connection = this.manager.getConnection();
    const schema = connection.getSchemaBuilder();
    
    const hasTable = await schema.hasTable(this.seedersTable);
    
    if (!hasTable) {
      // Create new seeders table with proper structure
      await schema.create(this.seedersTable, (table: any) => {
        table.increments('id');
        table.string('seeder').unique();
        table.integer('batch');
      });
    } else {
      // Check if we need to migrate legacy seeder table
      await this.migrateLegacySeedersTable(connection, schema);
    }
  }

  /**
   * Migrate legacy seeders table to new format
   * Handles old structure with run_at instead of batch
   * Also normalizes seeder names (removes .js extension if present)
   */
  protected async migrateLegacySeedersTable(connection: any, schema: any): Promise<void> {
    try {
      // Check if batch column exists
      const hasBatchColumn = await schema.hasColumn(this.seedersTable, 'batch');
      
      if (!hasBatchColumn) {
        // Check if this is a legacy table with run_at column
        const hasRunAtColumn = await schema.hasColumn(this.seedersTable, 'run_at');
        
        if (hasRunAtColumn) {
          // Migrate legacy table: add batch column
          await schema.table(this.seedersTable, (table: any) => {
            table.integer('batch').defaultTo(1);
          });
          
          // Set all existing seeders to batch 1
          await connection.table(this.seedersTable).update({ batch: 1 });
        } else {
          // Table exists but doesn't have batch or run_at - add batch column
          await schema.table(this.seedersTable, (table: any) => {
            table.integer('batch').defaultTo(1);
          });
        }
      }

      // Normalize seeder names: remove .js extension if present
      // This ensures compatibility between old (with .js) and new (without .js) formats
      const seeders = await connection.table(this.seedersTable).select('*').get();
      
      for (const seeder of seeders) {
        if (seeder.seeder.endsWith('.js')) {
          const normalizedName = seeder.seeder.replace('.js', '');
          
          // Check if normalized version already exists
          const existing = await connection
            .table(this.seedersTable)
            .where('seeder', normalizedName)
            .first();
          
          if (!existing) {
            // Update to normalized name (without .js)
            await connection
              .table(this.seedersTable)
              .where('id', seeder.id)
              .update({ seeder: normalizedName });
          } else {
            // Normalized version exists, delete the old one with .js
            await connection
              .table(this.seedersTable)
              .where('id', seeder.id)
              .delete();
          }
        }
      }

      // Ensure seeder column has unique constraint
      // Skip if already exists to avoid constraint errors
      const hasUniqueConstraint = await this.hasUniqueConstraint(connection, this.seedersTable, 'seeder');
      if (!hasUniqueConstraint) {
        try {
          await schema.table(this.seedersTable, (table: any) => {
            table.unique('seeder');
          });
        } catch (constraintError: any) {
          // Constraint might already exist, safe to ignore
          if (!constraintError.message.includes('already exists')) {
            throw constraintError;
          }
        }
      }
    } catch (error: any) {
      // If migration fails, log warning but don't fail the entire seeding process
      console.log(chalk.yellow(`⚠️  Warning: Could not migrate legacy seeders table: ${error.message}`));
    }
  }

  /**
   * Check if a column has a unique constraint
   * Uses safe parameterized queries to prevent SQL injection
   */
  protected async hasUniqueConstraint(connection: any, tableName: string, columnName: string): Promise<boolean> {
    try {
      const driver = connection.getConfig().driver;
      
      if (driver === 'postgresql' || driver === 'postgres' || driver === 'pgsql') {
        // Use safe query with table name check
        const result = await connection.select(`
          SELECT COUNT(*) as count
          FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
          WHERE t.relname = ?
          AND a.attname = ?
          AND c.contype = 'u'
        `, [tableName, columnName]);
        return parseInt(result[0]?.count || '0') > 0;
      } else if (driver === 'mysql') {
        const result = await connection.select(`
          SELECT COUNT(*) as count
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
          AND table_name = ?
          AND column_name = ?
          AND non_unique = 0
        `, [tableName, columnName]);
        return parseInt(result[0]?.count || '0') > 0;
      } else if (driver === 'sqlite') {
        // SQLite unique constraint check
        const result = await connection.select(`
          SELECT COUNT(*) as count
          FROM sqlite_master
          WHERE type = 'index'
          AND tbl_name = ?
          AND sql LIKE '%UNIQUE%'
          AND sql LIKE ?
        `, [tableName, `%${columnName}%`]);
        return parseInt(result[0]?.count || '0') > 0;
      }
      
      // For other drivers, assume no constraint
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a seeder has already been run
   * Checks for both normalized name (without .js) and legacy name (with .js)
   */
  protected async hasSeederRun(seederName: string): Promise<boolean> {
    const connection = this.manager.getConnection();
    
    // Check for normalized name (without .js)
    const result = await connection
      .table(this.seedersTable)
      .where('seeder', seederName)
      .first();
    
    if (result) {
      return true;
    }
    
    // Also check for legacy name (with .js) for backward compatibility
    const legacyName = `${seederName}.js`;
    const legacyResult = await connection
      .table(this.seedersTable)
      .where('seeder', legacyName)
      .first();
    
    return !!legacyResult;
  }

  /**
   * Log a seeder execution
   * Always logs with normalized name (without .js extension)
   */
  protected async logSeeder(seederName: string): Promise<void> {
    const connection = this.manager.getConnection();
    const batch = await this.getNextBatchNumber();
    
    // Normalize the seeder name (remove .js if present)
    const normalizedName = seederName.replace(/\.js$/, '');
    
    // Check if already logged (shouldn't happen, but just in case)
    const existing = await connection
      .table(this.seedersTable)
      .where('seeder', normalizedName)
      .first();
    
    if (!existing) {
      await connection.table(this.seedersTable).insert({
        seeder: normalizedName,
        batch
      });
    }
  }

  /**
   * Get the next batch number
   * Safely handles cases where batch column might not exist
   */
  protected async getNextBatchNumber(): Promise<number> {
    try {
      const connection = this.manager.getConnection();
      const results = await connection
        .table(this.seedersTable)
        .max('batch');
      
      // Handle different return formats
      let maxBatch = 0;
      if (Array.isArray(results) && results.length > 0) {
        maxBatch = results[0]?.max || results[0]?.['max(batch)'] || 0;
      } else if (typeof results === 'object' && results !== null) {
        maxBatch = (results as any).max || (results as any)['max(batch)'] || 0;
      } else if (typeof results === 'number') {
        maxBatch = results;
      }
      
      return (maxBatch || 0) + 1;
    } catch (error) {
      // If batch column doesn't exist or query fails, return 1
      return 1;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.manager.disconnect();
  }
}
