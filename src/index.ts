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

export * from './Eloquent/Model';
export { Builder as EloquentBuilder } from './Eloquent/Builder';
export { Collection as EloquentCollection } from './Eloquent/Collection';
export { Events, EventHandler } from './Eloquent/Events';
export { Scope, SoftDeletingScope, HasGlobalScopes } from './Eloquent/Scope';
export { Observer, ObserverRegistry } from './Eloquent/Observer';

// Model Concerns
export { SoftDeleteModel } from './Eloquent/Concerns/SoftDeletes';
export { HasUuids, UuidModel, HasUlids, UlidModel } from './Eloquent/Concerns/HasUuids';
export { PrunableModel, MassPrunableModel } from './Eloquent/Concerns/Prunable';

// Custom Casts
export { CastsAttributes, ArrayCast, JsonCast, EncryptedCast, AsCollectionCast, AsStringableCast } from './Eloquent/Casts/CastsAttributes';

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
export { Factory, FactoryManager, factory, defineFactory } from './Seeding/Factory';

export * from './Capsule/Manager';

export { Collection } from './Support/Collection';
export * from './Support/helpers';
export { QueryLogger, QueryLog, QueryListener } from './Support/QueryLogger';

// Import Manager for instance creation
import { Manager } from './Capsule/Manager';

// Export both the class and provide a lazy singleton getter
export { Manager as Capsule } from './Capsule/Manager';
export { Manager } from './Capsule/Manager';

// Create a lazy-initialized singleton that uses Manager.getInstance()
export const DB = new Proxy({} as Manager, {
  get(target, prop) {
    try {
      // Try to get the global instance set by MigrationRunner or user code
      const instance = Manager.getInstance();
      return (instance as any)[prop];
    } catch (e) {
      // No global instance yet, create one
      const instance = new Manager();
      instance.setAsGlobal();
      return (instance as any)[prop];
    }
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
