#!/usr/bin/env node

/**
 * guruORM CLI - Command line interface for guruORM
 */

import { Command } from 'commander';
import { MigrationMaker } from '../dist/CLI/MigrationMaker.js';
import { SeederMaker } from '../dist/CLI/SeederMaker.js';
import { FactoryMaker } from '../dist/CLI/FactoryMaker.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('guruorm')
  .description('guruORM - A powerful Node.js ORM')
  .version('1.6.0');

// Initialize command
program
  .command('init')
  .description('Initialize guruORM in your project')
  .action(() => {
    console.log('Initializing guruORM...');
    console.log('This feature will be implemented in Phase 8');
  });

// Migration commands
program
  .command('migrate')
  .description('Run the database migrations')
  .option('-d, --database <database>', 'The database connection to use')
  .option('--force', 'Force the operation to run in production')
  .option('--step <step>', 'Force the migrations to be run so they can be rolled back individually', parseInt)
  .option('--pretend', 'Dump the SQL queries that would be run')
  .action((options) => {
    console.log('Running migrations...', options);
    
    if (!options.force && process.env.NODE_ENV === 'production') {
      console.error('❌ Use --force to run migrations in production');
      process.exit(1);
    }
    
    if (options.step) {
      console.log(`   Running next ${options.step} migration(s)...`);
    }
    
    console.log('This feature will be implemented in Phase 4');
  });

program
  .command('migrate:rollback')
  .description('Rollback the last database migration')
  .option('--step <step>', 'The number of migrations to be reverted', parseInt)
  .option('--force', 'Force the operation to run in production')
  .action((options) => {
    console.log('Rolling back migrations...', options);
    
    if (!options.force && process.env.NODE_ENV === 'production') {
      console.error('❌ Use --force to rollback migrations in production');
      process.exit(1);
    }
    
    if (options.step) {
      console.log(`   Rolling back ${options.step} migration(s)...`);
    }
    
    console.log('This feature will be implemented in Phase 4');
  });

program
  .command('migrate:fresh')
  .description('Drop all tables and re-run all migrations')
  .option('--seed', 'Seed the database after migrating')
  .option('--force', 'Force the operation to run in production')
  .action(async (options) => {
    console.log('🔄 Dropping all tables and refreshing database...');
    console.log('');
    console.log('⚠️  This will drop all tables!');
    
    if (!options.force && process.env.NODE_ENV === 'production') {
      console.error('❌ Use --force to run in production');
      process.exit(1);
    }
    
    console.log('');
    console.log('Implementation:');
    console.log('  1. Run Schema::dropAllTables()');
    console.log('  2. Run all migrations');
    if (options.seed) {
      console.log('  3. Run db:seed');
    }
    console.log('');
    console.log('This feature requires a database connection setup');
  });

program
  .command('migrate:refresh')
  .description('Reset and re-run all migrations')
  .option('--seed', 'Seed the database after migrating')
  .option('--step <step>', 'The number of migrations to rollback')
  .option('--force', 'Force the operation to run in production')
  .action(async (options) => {
    console.log('🔄 Resetting and re-running migrations...');
    console.log('');
    
    if (!options.force && process.env.NODE_ENV === 'production') {
      console.error('❌ Use --force to run in production');
      process.exit(1);
    }
    
    console.log('Implementation:');
    console.log('  1. Run migrate:reset');
    console.log('  2. Run migrate');
    if (options.seed) {
      console.log('  3. Run db:seed');
    }
    console.log('');
    console.log('This feature requires a database connection setup');
  });

program
  .command('migrate:reset')
  .description('Rollback all database migrations')
  .action(() => {
    console.log('Resetting database...');
    console.log('This feature will be implemented in Phase 4');
  });

program
  .command('migrate:status')
  .description('Show the status of each migration')
  .action(() => {
    console.log('Migration status:');
    console.log('This feature will be implemented in Phase 4');
  });

// Make migration command
program
  .command('make:migration <name>')
  .description('Create a new migration file')
  .option('--table <table>', 'The table to modify')
  .option('--create <table>', 'The table to create')
  .action((name, options) => {
    try {
      const maker = new MigrationMaker();
      const tableName = options.create || options.table;
      const isCreate = !!options.create;
      
      const { fileName, contents, className } = maker.create(name, tableName, isCreate);
      
      const migrationsPath = path.join(process.cwd(), 'database', 'migrations');
      const fullPath = maker.write(migrationsPath, fileName, contents);
      
      console.log(`✅ Migration created successfully!`);
      console.log(`📄 ${fullPath}`);
      console.log(`🏷️  Class: ${className}`);
    } catch (error) {
      console.error('❌ Error creating migration:', error.message);
      process.exit(1);
    }
  });

// Seeder commands
program
  .command('db:seed')
  .description('Seed the database with records')
  .option('--class <class>', 'The seeder class to run', 'DatabaseSeeder')
  .option('--force', 'Force the operation to run in production')
  .action(async (options) => {
    try {
      console.log(`🌱 Seeding database with ${options.class}...`);
      console.log('');
      
      // Dynamically import the seeder
      const seederPath = path.join(process.cwd(), 'database', 'seeders', `${options.class}.js`);
      
      try {
        const { default: SeederClass } = await import(seederPath);
        const seeder = new SeederClass();
        
        if (typeof seeder.run !== 'function') {
          throw new Error(`Seeder ${options.class} must have a run() method`);
        }
        
        await seeder.run();
        console.log('');
        console.log(`✅ Database seeding completed successfully!`);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND') {
          console.error(`❌ Seeder not found: ${options.class}`);
          console.log(`   Expected: ${seederPath}`);
          console.log('');
          console.log('   Create it with: guruorm make:seeder ' + options.class);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Error seeding database:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('make:seeder <name>')
  .description('Create a new seeder class')
  .action((name) => {
    try {
      const maker = new SeederMaker();
      const { fileName, contents, className } = maker.create(name);
      
      const seedersPath = path.join(process.cwd(), 'database', 'seeders');
      const fullPath = maker.write(seedersPath, fileName, contents);
      
      console.log(`✅ Seeder created successfully!`);
      console.log(`📄 ${fullPath}`);
      console.log(`🏷️  Class: ${className}`);
    } catch (error) {
      console.error('❌ Error creating seeder:', error.message);
      process.exit(1);
    }
  });

// Make factory command
program
  .command('make:factory <name>')
  .description('Create a new factory class')
  .option('--model <model>', 'The model name for the factory')
  .action((name, options) => {
    try {
      const maker = new FactoryMaker();
      const { fileName, contents, className } = maker.create(name, options.model);
      
      const factoriesPath = path.join(process.cwd(), 'database', 'factories');
      const fullPath = maker.write(factoriesPath, fileName, contents);
      
      console.log(`✅ Factory created successfully!`);
      console.log(`📄 ${fullPath}`);
      console.log(`🏷️  Class: ${className}`);
    } catch (error) {
      console.error('❌ Error creating factory:', error.message);
      process.exit(1);
    }
  });

// Schema commands
program
  .command('schema:dump')
  .description('Dump the database schema')
  .option('--database <database>', 'The database connection to use')
  .action((options) => {
    console.log('Dumping schema...', options);
    console.log('This feature will be implemented in Phase 8');
  });

program
  .command('db:show')
  .description('Display information about the database')
  .option('--database <database>', 'The database connection to use')
  .action((options) => {
    console.log('Database information:', options);
    console.log('This feature will be implemented in Phase 8');
  });

// Model commands
program
  .command('model:prune')
  .description('Prune models marked as prunable')
  .option('--model <model>', 'The model to prune')
  .option('--chunk <chunk>', 'The chunk size for processing', '1000')
  .option('--pretend', 'Display the number of prunable records without deleting')
  .action(async (options) => {
    console.log('Pruning models...', options);
    console.log('');
    console.log('Usage: Import your prunable model and call Model.prune()');
    console.log('');
    console.log('Example:');
    console.log('  import { MyModel } from "./models/MyModel"');
    console.log('  const pruned = await MyModel.prune(1000);');
    console.log('  console.log(`Pruned ${pruned} models`);');
  });

program.parse(process.argv);
