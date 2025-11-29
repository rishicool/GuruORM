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
  .description('guruORM - A powerful Node.js ORM inspired by Laravel')
  .version('1.0.0');

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
  .action((options) => {
    console.log('Running migrations...', options);
    console.log('This feature will be implemented in Phase 4');
  });

program
  .command('migrate:rollback')
  .description('Rollback the last database migration')
  .option('--step <step>', 'The number of migrations to be reverted')
  .action((options) => {
    console.log('Rolling back migrations...', options);
    console.log('This feature will be implemented in Phase 4');
  });

program
  .command('migrate:fresh')
  .description('Drop all tables and re-run all migrations')
  .option('--seed', 'Seed the database after migrating')
  .action((options) => {
    console.log('Refreshing database...', options);
    console.log('This feature will be implemented in Phase 4');
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
  .option('--class <class>', 'The seeder class to run')
  .action((options) => {
    console.log('Seeding database...', options);
    console.log('This feature will be implemented in Phase 7');
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

program.parse(process.argv);
