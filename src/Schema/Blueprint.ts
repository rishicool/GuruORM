import { Connection } from '../Connection/Connection';

export interface ColumnDefinition {
  type: string;
  name: string;
  length?: number;
  precision?: number;
  scale?: number;
  unsigned?: boolean;
  nullable?: boolean;
  default?: any;
  autoIncrement?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  comment?: string;
  after?: string;
  first?: boolean;
  charset?: string;
  collation?: string;
}

export class Blueprint {
  protected table: string;
  protected columns: ColumnDefinition[] = [];
  protected commands: any[] = [];

  constructor(table: string) {
    this.table = table;
  }

  /**
   * Get the table name.
   */
  getTable(): string {
    return this.table;
  }

  /**
   * Get the columns defined on the blueprint.
   */
  getColumns(): ColumnDefinition[] {
    return this.columns;
  }

  /**
   * Get the commands defined on the blueprint.
   */
  getCommands(): any[] {
    return this.commands;
  }

  /**
   * Add a new column to the blueprint.
   */
  protected addColumn(type: string, name: string, parameters: Partial<ColumnDefinition> = {}): ColumnDefinition {
    const column: ColumnDefinition = {
      type,
      name,
      ...parameters,
    };

    this.columns.push(column);
    return column;
  }

  /**
   * Create a new auto-incrementing big integer column.
   */
  id(column: string = 'id'): ColumnDefinition {
    return this.addColumn('bigIncrements', column, { autoIncrement: true, primary: true });
  }

  /**
   * Create a new string column.
   */
  string(column: string, length: number = 255): ColumnDefinition {
    return this.addColumn('string', column, { length });
  }

  /**
   * Create a new text column.
   */
  text(column: string): ColumnDefinition {
    return this.addColumn('text', column);
  }

  /**
   * Create a new integer column.
   */
  integer(column: string): ColumnDefinition {
    return this.addColumn('integer', column);
  }

  /**
   * Create a new big integer column.
   */
  bigInteger(column: string): ColumnDefinition {
    return this.addColumn('bigInteger', column);
  }

  /**
   * Create a new boolean column.
   */
  boolean(column: string): ColumnDefinition {
    return this.addColumn('boolean', column);
  }

  /**
   * Create a new date column.
   */
  date(column: string): ColumnDefinition {
    return this.addColumn('date', column);
  }

  /**
   * Create a new datetime column.
   */
  datetime(column: string): ColumnDefinition {
    return this.addColumn('datetime', column);
  }

  /**
   * Create a new timestamp column.
   */
  timestamp(column: string): ColumnDefinition {
    return this.addColumn('timestamp', column);
  }

  /**
   * Add creation and update timestamps to the table.
   */
  timestamps(): void {
    const createdAt = this.timestamp('created_at');
    createdAt.nullable = true;
    const updatedAt = this.timestamp('updated_at');
    updatedAt.nullable = true;
  }

  /**
   * Create a new JSON column.
   */
  json(column: string): ColumnDefinition {
    return this.addColumn('json', column);
  }

  /**
   * Specify the primary key(s) for the table.
   */
  primary(columns: string | string[]): void {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    this.commands.push({
      type: 'primary',
      columns: columnArray,
    });
  }

  /**
   * Specify a unique index for the column.
   */
  unique(columns: string | string[], indexName?: string): void {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    this.commands.push({
      type: 'unique',
      columns: columnArray,
      index: indexName,
    });
  }

  /**
   * Specify an index for the column.
   */
  index(columns: string | string[], indexName?: string): void {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    this.commands.push({
      type: 'index',
      columns: columnArray,
      index: indexName,
    });
  }

  /**
   * Specify a foreign key for the table.
   */
  foreign(columns: string | string[]): ForeignKeyDefinition {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    const foreignKey = new ForeignKeyDefinition(columnArray);
    this.commands.push({
      type: 'foreign',
      definition: foreignKey,
    });
    return foreignKey;
  }

  /**
   * Drop a column from the table.
   */
  dropColumn(columns: string | string[]): void {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    this.commands.push({
      type: 'dropColumn',
      columns: columnArray,
    });
  }

  /**
   * Drop the table.
   */
  drop(): void {
    this.commands.push({
      type: 'drop',
    });
  }

  /**
   * Execute the blueprint against the database.
   */
  async build(connection: Connection): Promise<void> {
    // This will be implemented when we have full Schema Builder
    throw new Error('Blueprint execution not yet implemented');
  }
}

export class ForeignKeyDefinition {
  protected columns: string[];
  protected _on?: string;
  protected _references?: string[];
  protected _onDelete?: string;
  protected _onUpdate?: string;

  constructor(columns: string[]) {
    this.columns = columns;
  }

  /**
   * Specify the referenced table.
   */
  references(columns: string | string[]): this {
    this._references = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  /**
   * Specify the referenced table.
   */
  on(table: string): this {
    this._on = table;
    return this;
  }

  /**
   * Add an ON DELETE action.
   */
  onDelete(action: string): this {
    this._onDelete = action;
    return this;
  }

  /**
   * Add an ON UPDATE action.
   */
  onUpdate(action: string): this {
    this._onUpdate = action;
    return this;
  }

  /**
   * Set the foreign key to cascade on delete.
   */
  cascadeOnDelete(): this {
    return this.onDelete('cascade');
  }

  /**
   * Set the foreign key to cascade on update.
   */
  cascadeOnUpdate(): this {
    return this.onUpdate('cascade');
  }
}
