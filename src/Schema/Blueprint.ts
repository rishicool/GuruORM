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
  storedAs?: string;
  virtualAs?: string;
  generatedAs?: string;
  always?: boolean;
  invisible?: boolean;
  useCurrent?: boolean;
  useCurrentOnUpdate?: boolean;
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
   * Create a new tiny integer column.
   */
  tinyInteger(column: string): ColumnDefinition {
    return this.addColumn('tinyInteger', column);
  }

  /**
   * Create a new small integer column.
   */
  smallInteger(column: string): ColumnDefinition {
    return this.addColumn('smallInteger', column);
  }

  /**
   * Create a new medium integer column.
   */
  mediumInteger(column: string): ColumnDefinition {
    return this.addColumn('mediumInteger', column);
  }

  /**
   * Create a new unsigned integer column.
   */
  unsignedInteger(column: string): ColumnDefinition {
    return this.addColumn('integer', column, { unsigned: true });
  }

  /**
   * Create a new unsigned big integer column.
   */
  unsignedBigInteger(column: string): ColumnDefinition {
    return this.addColumn('bigInteger', column, { unsigned: true });
  }

  /**
   * Create a new float column.
   */
  float(column: string, precision: number = 8, scale: number = 2): ColumnDefinition {
    return this.addColumn('float', column, { precision, scale });
  }

  /**
   * Create a new double column.
   */
  double(column: string, precision: number = 8, scale: number = 2): ColumnDefinition {
    return this.addColumn('double', column, { precision, scale });
  }

  /**
   * Create a new decimal column.
   */
  decimal(column: string, precision: number = 8, scale: number = 2): ColumnDefinition {
    return this.addColumn('decimal', column, { precision, scale });
  }

  /**
   * Create a new char column.
   */
  char(column: string, length: number = 255): ColumnDefinition {
    return this.addColumn('char', column, { length });
  }

  /**
   * Create a new medium text column.
   */
  mediumText(column: string): ColumnDefinition {
    return this.addColumn('mediumText', column);
  }

  /**
   * Create a new long text column.
   */
  longText(column: string): ColumnDefinition {
    return this.addColumn('longText', column);
  }

  /**
   * Create a new binary column.
   */
  binary(column: string): ColumnDefinition {
    return this.addColumn('binary', column);
  }

  /**
   * Create a new UUID column.
   */
  uuid(column: string): ColumnDefinition {
    return this.addColumn('uuid', column);
  }

  /**
   * Create a new ULID column.
   */
  ulid(column: string): ColumnDefinition {
    return this.addColumn('ulid', column);
  }

  /**
   * Create a new enum column.
   */
  enum(column: string, allowed: string[]): ColumnDefinition {
    return this.addColumn('enum', column, { allowed } as any);
  }

  /**
   * Create a new set column.
   */
  set(column: string, allowed: string[]): ColumnDefinition {
    return this.addColumn('set', column, { allowed } as any);
  }

  /**
   * Create a new time column.
   */
  time(column: string): ColumnDefinition {
    return this.addColumn('time', column);
  }

  /**
   * Create a new year column.
   */
  year(column: string): ColumnDefinition {
    return this.addColumn('year', column);
  }

  /**
   * Create a new JSONB column (PostgreSQL).
   */
  jsonb(column: string): ColumnDefinition {
    return this.addColumn('jsonb', column);
  }

  /**
   * Create a new IP address column.
   */
  ipAddress(column: string): ColumnDefinition {
    return this.addColumn('ipAddress', column);
  }

  /**
   * Create a new MAC address column.
   */
  macAddress(column: string): ColumnDefinition {
    return this.addColumn('macAddress', column);
  }

  /**
   * Create a new geometry column.
   */
  geometry(column: string): ColumnDefinition {
    return this.addColumn('geometry', column);
  }

  /**
   * Create a new point column.
   */
  point(column: string): ColumnDefinition {
    return this.addColumn('point', column);
  }

  /**
   * Create a new linestring column.
   */
  lineString(column: string): ColumnDefinition {
    return this.addColumn('lineString', column);
  }

  /**
   * Create a new polygon column.
   */
  polygon(column: string): ColumnDefinition {
    return this.addColumn('polygon', column);
  }

  /**
   * Create a new morphs columns for polymorphic relationship.
   */
  morphs(name: string, indexName?: string): void {
    this.unsignedBigInteger(`${name}_id`);
    this.string(`${name}_type`);
    
    this.index([`${name}_id`, `${name}_type`], indexName);
  }

  /**
   * Create a new nullable morphs columns.
   */
  nullableMorphs(name: string, indexName?: string): void {
    const idColumn = this.unsignedBigInteger(`${name}_id`);
    idColumn.nullable = true;
    
    const typeColumn = this.string(`${name}_type`);
    typeColumn.nullable = true;
    
    this.index([`${name}_id`, `${name}_type`], indexName);
  }

  /**
   * Create a new UUID morphs columns.
   */
  uuidMorphs(name: string, indexName?: string): void {
    this.uuid(`${name}_id`);
    this.string(`${name}_type`);
    
    this.index([`${name}_id`, `${name}_type`], indexName);
  }

  /**
   * Create a new ULID morphs columns.
   */
  ulidMorphs(name: string, indexName?: string): void {
    this.ulid(`${name}_id`);
    this.string(`${name}_type`);
    
    this.index([`${name}_id`, `${name}_type`], indexName);
  }

  /**
   * Add soft delete column.
   */
  softDeletes(column: string = 'deleted_at'): ColumnDefinition {
    const col = this.timestamp(column);
    col.nullable = true;
    return col;
  }

  /**
   * Add remember token column for authentication.
   */
  rememberToken(): ColumnDefinition {
    const col = this.string('remember_token', 100);
    col.nullable = true;
    return col;
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
   * Specify a full-text index for the column.
   */
  fullText(columns: string | string[], indexName?: string): void {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    this.commands.push({
      type: 'fullText',
      columns: columnArray,
      index: indexName,
    });
  }

  /**
   * Specify a spatial index for the column (MySQL/PostgreSQL).
   */
  spatialIndex(columns: string | string[], indexName?: string): void {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    this.commands.push({
      type: 'spatialIndex',
      columns: columnArray,
      index: indexName,
    });
  }

  /**
   * Drop an index from the table.
   */
  dropIndex(indexName: string | string[]): void {
    const indexes = Array.isArray(indexName) ? indexName : [indexName];
    this.commands.push({
      type: 'dropIndex',
      indexes,
    });
  }

  /**
   * Drop a unique index from the table.
   */
  dropUnique(indexName: string | string[]): void {
    const indexes = Array.isArray(indexName) ? indexName : [indexName];
    this.commands.push({
      type: 'dropUnique',
      indexes,
    });
  }

  /**
   * Drop a primary key from the table.
   */
  dropPrimary(indexName?: string): void {
    this.commands.push({
      type: 'dropPrimary',
      index: indexName,
    });
  }

  /**
   * Drop a foreign key from the table.
   */
  dropForeign(indexName: string | string[]): void {
    const indexes = Array.isArray(indexName) ? indexName : [indexName];
    this.commands.push({
      type: 'dropForeign',
      indexes,
    });
  }

  /**
   * Rename an index on the table.
   */
  renameIndex(from: string, to: string): void {
    this.commands.push({
      type: 'renameIndex',
      from,
      to,
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

  /**
   * Set the foreign key to set NULL on delete.
   */
  nullOnDelete(): this {
    return this.onDelete('set null');
  }

  /**
   * Set the foreign key to restrict on delete.
   */
  restrictOnDelete(): this {
    return this.onDelete('restrict');
  }

  /**
   * Set the foreign key to restrict on update.
   */
  restrictOnUpdate(): this {
    return this.onUpdate('restrict');
  }

  /**
   * Set the foreign key to no action on delete.
   */
  noActionOnDelete(): this {
    return this.onDelete('no action');
  }

  /**
   * Set the foreign key to no action on update.
   */
  noActionOnUpdate(): this {
    return this.onUpdate('no action');
  }

  /**
   * Get the foreign key definition.
   */
  getDefinition(): any {
    return {
      columns: this.columns,
      on: this._on,
      references: this._references,
      onDelete: this._onDelete,
      onUpdate: this._onUpdate,
    };
  }
}
