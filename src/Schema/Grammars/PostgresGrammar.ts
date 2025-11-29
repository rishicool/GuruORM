import { Grammar } from './Grammar';

/**
 * PostgreSQL Schema Grammar - extends base Schema Grammar
 * PostgreSQL-specific DDL statements
 */
export class PostgresGrammar extends Grammar {
  /**
   * Compile the query to determine if a table exists
   */
  compileTableExists(): string {
    return 'select * from information_schema.tables where table_schema = $1 and table_name = $2';
  }

  /**
   * Compile the query to determine the list of columns
   */
  compileColumnListing(): string {
    return 'select column_name from information_schema.columns where table_schema = $1 and table_name = $2';
  }

  /**
   * Compile the query to get column type
   */
  compileColumnType(): string {
    return 'select data_type from information_schema.columns where table_schema = $1 and table_name = $2 and column_name = $3';
  }

  /**
   * Compile the command to enable foreign key constraints
   */
  compileEnableForeignKeyConstraints(): string {
    return 'SET CONSTRAINTS ALL IMMEDIATE;';
  }

  /**
   * Compile the command to disable foreign key constraints
   */
  compileDisableForeignKeyConstraints(): string {
    return 'SET CONSTRAINTS ALL DEFERRED;';
  }

  /**
   * Compile the query to get all tables
   */
  compileGetAllTables(): string {
    return "select tablename from pg_catalog.pg_tables where schemaname not in ('pg_catalog', 'information_schema')";
  }
}
