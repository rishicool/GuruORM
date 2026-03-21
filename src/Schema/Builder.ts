import { Connection } from '../Connection/Connection';
import { Grammar } from './Grammars/Grammar';
import { Blueprint } from './Blueprint';

/**
 * Schema Builder - inspired by Laravel and Illuminate
 * Provides methods for creating and modifying database schema
 */
export class Builder {
  protected connection: Connection;
  protected grammar: Grammar;

  constructor(connection: Connection) {
    this.connection = connection;
    this.grammar = connection.getSchemaGrammar();
  }

  /**
   * Determine if the given table exists
   */
  async hasTable(table: string): Promise<boolean> {
    const sql = this.grammar.compileTableExists();
    const schema = this.connection.getSchemaName();

    const results = await this.connection.select(sql, [schema, table]);
    return results.length > 0;
  }

  /**
   * Get the column listing for a given table
   */
  async getColumnListing(table: string): Promise<string[]> {
    const sql = this.grammar.compileColumnListing();
    const schema = this.connection.getSchemaName();

    const results = await this.connection.select(sql, [schema, table]);
    return this.connection.getPostProcessor().processColumnListing(results);
  }

  /**
   * Create a new table on the schema
   */
  async create(table: string, callback: (blueprint: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint(table);
    
    // Call the callback to define columns
    callback(blueprint);
    
    // Get all columns from the blueprint
    const columns = blueprint.getColumns();
    
    // Compile each column definition
    const columnDefinitions = columns.map(column => this.grammar.compileColumn(column));
    
    // Compile the CREATE TABLE statement
    const sql = this.grammar.compileCreateTable(table, columnDefinitions);
    
    // Execute the CREATE TABLE statement
    await this.connection.statement(sql);
    
    // Process commands (indexes, foreign keys, etc.)
    const commands = blueprint.getCommands();
    for (const command of commands) {
      await this.executeCommand(table, command);
    }
  }
  
  /**
   * Execute a blueprint command
   */
  private async executeCommand(table: string, command: any): Promise<void> {
    const tableName = this.grammar.wrapTable(table);
    
    switch (command.type) {
      case 'primary':
        const primaryCols = command.columns.map((col: string) => this.grammar.wrap(col)).join(', ');
        await this.connection.statement(`ALTER TABLE ${tableName} ADD PRIMARY KEY (${primaryCols})`);
        break;
        
      case 'unique':
        const uniqueCols = command.columns.map((col: string) => this.grammar.wrap(col)).join(', ');
        const uniqueName = command.index || `${table}_${command.columns.join('_')}_unique`;
        await this.connection.statement(`ALTER TABLE ${tableName} ADD CONSTRAINT ${this.grammar.wrap(uniqueName)} UNIQUE (${uniqueCols})`);
        break;
        
      case 'index':
        const indexCols = command.columns.map((col: string) => this.grammar.wrap(col)).join(', ');
        const indexName = command.index || `${table}_${command.columns.join('_')}_index`;
        await this.connection.statement(`CREATE INDEX ${this.grammar.wrap(indexName)} ON ${tableName} (${indexCols})`);
        break;
        
      case 'foreign':
        const fkDef = command.definition.getDefinition();
        const fkCols = fkDef.columns.map((col: string) => this.grammar.wrap(col)).join(', ');
        const refCols = fkDef.references.map((col: string) => this.grammar.wrap(col)).join(', ');
        const refTable = this.grammar.wrapTable(fkDef.on);
        
        let fkSql = `ALTER TABLE ${tableName} ADD FOREIGN KEY (${fkCols}) REFERENCES ${refTable} (${refCols})`;
        
        if (fkDef.onDelete) {
          fkSql += ` ON DELETE ${fkDef.onDelete.toUpperCase()}`;
        }
        
        if (fkDef.onUpdate) {
          fkSql += ` ON UPDATE ${fkDef.onUpdate.toUpperCase()}`;
        }
        
        await this.connection.statement(fkSql);
        break;
        
      case 'spatialIndex':
        const spatialCols = command.columns.map((col: string) => this.grammar.wrap(col)).join(', ');
        const spatialName = command.index || `${table}_${command.columns.join('_')}_spatial`;
        await this.connection.statement(`CREATE INDEX ${this.grammar.wrap(spatialName)} ON ${tableName} USING GIST (${spatialCols})`);
        break;

      case 'dropColumn':
        for (const col of command.columns) {
          await this.connection.statement(this.grammar.compileDropColumn(table, col));
        }
        break;

      case 'renameColumn':
        await this.connection.statement(
          this.grammar.compileRenameColumn(table, command.from, command.to)
        );
        break;

      case 'modifyColumn':
        const modifyDef = this.grammar.compileColumn(command.column);
        await this.connection.statement(this.grammar.compileModifyColumn(table, modifyDef));
        break;
    }
  }

  /**
   * Drop a table from the schema
   */
  async drop(table: string): Promise<void> {
    const sql = this.grammar.compileDropTable(table);
    await this.connection.statement(sql);
  }

  /**
   * Drop a table from the schema if it exists
   */
  async dropIfExists(table: string): Promise<void> {
    const sql = this.grammar.compileDropTableIfExists(table);
    await this.connection.statement(sql);
  }

  /**
   * Rename a table on the schema
   */
  async rename(from: string, to: string): Promise<void> {
    const sql = this.grammar.compileRenameTable(from, to);
    await this.connection.statement(sql);
  }

  /**
   * Determine if the given table has a given column
   */
  async hasColumn(table: string, column: string): Promise<boolean> {
    const columns = await this.getColumnListing(table);
    return columns.includes(column);
  }

  /**
   * Determine if the given table has given columns
   */
  async hasColumns(table: string, columns: string[]): Promise<boolean> {
    const tableColumns = await this.getColumnListing(table);
    return columns.every(column => tableColumns.includes(column));
  }

  /**
   * Determine if the given table has a given index.
   * Delegates to the grammar for cross-dialect SQL generation.
   */
  async hasIndex(table: string, indexName: string): Promise<boolean> {
    const sql = this.grammar.compileIndexExists();
    const results = await this.connection.select(sql, [table, indexName]);
    return results.length > 0;
  }

  /**
   * Get the data type for a given column
   */
  async getColumnType(table: string, column: string): Promise<string> {
    const sql = this.grammar.compileColumnType();
    const schema = this.connection.getSchemaName();
    
    const results = await this.connection.select(sql, [schema, table, column]);
    if (results.length === 0) {
      throw new Error(`Column ${column} does not exist on table ${table}`);
    }
    
    return results[0].data_type;
  }

  /**
   * Alias for create() — Laravel-compatible API
   */
  async createTable(table: string, callback: (blueprint: Blueprint) => void): Promise<void> {
    return this.create(table, callback);
  }

  /**
   * Modify a table on the schema
   */
  async table(table: string, callback: (blueprint: Blueprint) => void): Promise<void> {
    // Check if table exists, if not create it
    const exists = await this.hasTable(table);
    
    if (!exists) {
      // Table doesn't exist, create it instead
      return await this.create(table, callback);
    }
    
    const blueprint = new Blueprint(table);
    
    // Call the callback to define modifications
    callback(blueprint);
    
    // Get all columns from the blueprint
    const columns = blueprint.getColumns();
    
    // For each new column, add it to the table
    for (const column of columns) {
      const columnDef = this.grammar.compileColumn(column);
      const sql = `ALTER TABLE ${this.grammar.wrapTable(table)} ADD COLUMN ${columnDef}`;
      await this.connection.statement(sql);
    }
    
    // Get commands for other operations (indexes, foreign keys, drop, rename, etc.)
    const commands = blueprint.getCommands();
    for (const command of commands) {
      await this.executeCommand(table, command);
    }
  }

  /**
   * Drop all tables from the database.
   * Uses grammar-provided FK constraint SQL for cross-dialect support.
   */
  async dropAllTables(): Promise<void> {
    await this.disableForeignKeyConstraints();

    const tables = await this.getAllTables();
    for (const table of tables) {
      await this.drop(table);
    }

    await this.enableForeignKeyConstraints();
  }

  /**
   * Get all tables from the database
   */
  async getAllTables(): Promise<string[]> {
    const sql = this.grammar.compileGetAllTables();
    const results = await this.connection.select(sql);
    return results.map((result: any) => Object.values(result)[0] as string);
  }

  /**
   * Enable foreign key constraints
   */
  async enableForeignKeyConstraints(): Promise<void> {
    await this.connection.statement(this.grammar.compileEnableForeignKeyConstraints());
  }

  /**
   * Disable foreign key constraints
   */
  async disableForeignKeyConstraints(): Promise<void> {
    await this.connection.statement(this.grammar.compileDisableForeignKeyConstraints());
  }

  /**
   * Execute callback with foreign key constraints disabled
   */
  async withoutForeignKeyConstraints(callback: () => Promise<void>): Promise<void> {
    await this.disableForeignKeyConstraints();
    
    try {
      await callback();
    } finally {
      await this.enableForeignKeyConstraints();
    }
  }

  /**
   * Get the database connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Set the database connection instance
   */
  setConnection(connection: Connection): this {
    this.connection = connection;
    return this;
  }
}
