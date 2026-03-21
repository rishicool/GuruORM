// Main entry point for guruORM
export * from './Connection/ConnectionInterface';
export * from './Connection/Connection';
export * from './Connection/ConnectionResolver';
export * from './Connection/ConnectionManager';
export * from './Connection/MySqlConnection';
export * from './Connection/PostgresConnection';
export * from './Connection/SqliteConnection';
export * from './Connection/SqlServerConnection';

export { Builder as QueryBuilder } from './Query/Builder';
export * from './Query/Expression';
export * from './Query/JoinClause';

export { Builder as SchemaBuilder } from './Schema/Builder';
export * from './Schema/Blueprint';
export { Grammar as SchemaGrammar } from './Schema/Grammars/Grammar';
export { Grammar as MySqlSchemaGrammar } from './Schema/Grammars/MySqlGrammar';
export { PostgresGrammar as PostgresSchemaGrammar } from './Schema/Grammars/PostgresGrammar';
export { SqliteGrammar as SqliteSchemaGrammar } from './Schema/Grammars/SqliteGrammar';

export * from './Eloquent/Model';
export { Builder as EloquentBuilder } from './Eloquent/Builder';
export { Collection as EloquentCollection } from './Eloquent/Collection';
export type { Events, EventHandler } from './Eloquent/Events';
export type { Scope } from './Eloquent/Scope';
export { SoftDeletingScope, HasGlobalScopes } from './Eloquent/Scope';
export type { Observer } from './Eloquent/Observer';
export { ObserverRegistry } from './Eloquent/Observer';

// Model Concerns — both mixin functions (composable) and class-based exports (backward compat)
export { SoftDeletes, SoftDeleteModel } from './Eloquent/Concerns/SoftDeletes';
export { HasUuids, HasUlids, UuidModel, UlidModel } from './Eloquent/Concerns/HasUuids';
export { Prunable, MassPrunable, PrunableModel, MassPrunableModel } from './Eloquent/Concerns/Prunable';

// Custom Casts
export type { CastsAttributes } from './Eloquent/Casts/CastsAttributes';
export { ArrayCast, JsonCast, EncryptedCast, LegacyEncryptedCast, AsCollectionCast, AsStringableCast } from './Eloquent/Casts/CastsAttributes';

// Relations
export { Relation } from './Eloquent/Relations/Relation';
export { HasOne } from './Eloquent/Relations/HasOne';
export { HasMany } from './Eloquent/Relations/HasMany';
export { BelongsTo } from './Eloquent/Relations/BelongsTo';
export { BelongsToMany } from './Eloquent/Relations/BelongsToMany';
export { HasOneThrough } from './Eloquent/Relations/HasOneThrough';
export { HasManyThrough } from './Eloquent/Relations/HasManyThrough';
export { MorphOne } from './Eloquent/Relations/MorphOne';
export { MorphMany } from './Eloquent/Relations/MorphMany';
export { MorphTo } from './Eloquent/Relations/MorphTo';

export * from './Migrations/Migration';
export * from './Migrations/Migrator';

export * from './Seeding/Seeder';
export type { Factory } from './Seeding/Factory';
export { FactoryManager, factory, defineFactory } from './Seeding/Factory';

export * from './Capsule/Manager';

export { Collection } from './Support/Collection';
export * from './Support/helpers';
export type { QueryLog, QueryListener } from './Support/QueryLogger';
export { QueryLogger } from './Support/QueryLogger';

// Errors — structured exception hierarchy
export {
  GuruORMError,
  QueryException,
  ModelNotFoundException,
  ConnectionException,
  RelationNotFoundException,
  MultipleRecordsFoundException,
} from './Errors/GuruORMError';

// Import Manager for instance creation
import { Manager } from './Capsule/Manager';

// Export both the class and provide a lazy singleton getter
export { Manager as Capsule } from './Capsule/Manager';
export { Manager } from './Capsule/Manager';

// Create a lazy-initialized singleton that uses Manager.getInstance()
// Pre-binds hot methods so that this.xxx inside Manager methods are
// direct property accesses instead of Proxy trampoline calls.
let _cachedManager: Manager | null = null;
let _select: Function | null = null;
let _table: Function | null = null;
let _transaction: Function | null = null;

function _initDB(): void {
  try {
    _cachedManager = Manager.getInstance();
  } catch {
    _cachedManager = new Manager();
    _cachedManager.setAsGlobal();
  }
  _select = _cachedManager.select.bind(_cachedManager);
  _table = _cachedManager.table.bind(_cachedManager);
  _transaction = _cachedManager.transaction.bind(_cachedManager);
}

export const DB = new Proxy({} as Manager, {
  get(_target, prop) {
    if (_cachedManager) {
      switch (prop) {
        case 'select': return _select;
        case 'table': return _table;
        case 'transaction': return _transaction;
        default: return (_cachedManager as any)[prop];
      }
    }
    _initDB();
    switch (prop) {
      case 'select': return _select;
      case 'table': return _table;
      case 'transaction': return _transaction;
      default: return (_cachedManager as any)[prop];
    }
  },
  set(_target, prop, value) {
    if (!_cachedManager) _initDB();
    (_cachedManager as any)[prop] = value;
    return true;
  }
});

// Schema helper that uses the global instance via Manager.getInstance()
const Schema = {
  create: async (table: string, callback: any) => {
    return Manager.getInstance().schema().create(table, callback);
  },
  table: async (table: string, callback: any) => {
    return Manager.getInstance().schema().table(table, callback);
  },
  drop: async (table: string) => {
    return Manager.getInstance().schema().drop(table);
  },
  dropIfExists: async (table: string) => {
    return Manager.getInstance().schema().dropIfExists(table);
  },
  hasTable: async (table: string) => {
    return Manager.getInstance().schema().hasTable(table);
  },
  hasColumn: async (table: string, column: string) => {
    return Manager.getInstance().schema().hasColumn(table, column);
  },
  rename: async (from: string, to: string) => {
    return Manager.getInstance().schema().rename(from, to);
  },
  enableForeignKeyConstraints: async () => {
    return Manager.getInstance().schema().enableForeignKeyConstraints();
  },
  disableForeignKeyConstraints: async () => {
    return Manager.getInstance().schema().disableForeignKeyConstraints();
  },
  withoutForeignKeyConstraints: async (callback: () => Promise<void>) => {
    return Manager.getInstance().schema().withoutForeignKeyConstraints(callback);
  },
};

export { Schema };

export { UniversalLoader } from './Support/UniversalLoader';
