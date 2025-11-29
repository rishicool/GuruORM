/**
 * Migration Events
 * Events dispatched during the migration lifecycle
 */

export interface MigrationEvent {
  timestamp: Date;
}

export interface MigrationsStartedEvent extends MigrationEvent {
  method: 'up' | 'down';
}

export interface MigrationsEndedEvent extends MigrationEvent {
  method: 'up' | 'down';
}

export interface MigrationStartedEvent extends MigrationEvent {
  migration: string;
  batch: number;
}

export interface MigrationEndedEvent extends MigrationEvent {
  migration: string;
  batch: number;
  method: 'up' | 'down';
}

export interface NoPendingMigrationsEvent extends MigrationEvent {}

export interface SchemaDumpedEvent extends MigrationEvent {
  path: string;
}

export interface SchemaLoadedEvent extends MigrationEvent {
  path: string;
}

export type MigrationEventType = 
  'migrations.started' |
  'migrations.ended' |
  'migration.started' |
  'migration.ended' |
  'migrations.none' |
  'schema.dumped' |
  'schema.loaded';

export type MigrationEventHandler = (event: any) => void | Promise<void>;

/**
 * Migration Event Dispatcher
 */
export class MigrationEventDispatcher {
  protected listeners: Map<MigrationEventType, MigrationEventHandler[]> = new Map();

  /**
   * Register an event listener
   */
  listen(event: MigrationEventType, handler: MigrationEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Dispatch an event
   */
  async dispatch(event: MigrationEventType, data: any): Promise<void> {
    const handlers = this.listeners.get(event) || [];
    
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Remove all listeners for an event
   */
  forget(event: MigrationEventType): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  flush(): void {
    this.listeners.clear();
  }

  /**
   * Get all listeners for an event
   */
  getListeners(event: MigrationEventType): MigrationEventHandler[] {
    return this.listeners.get(event) || [];
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event: MigrationEventType): boolean {
    return (this.listeners.get(event)?.length || 0) > 0;
  }
}

/**
 * Global migration event dispatcher instance
 */
export const migrationEvents = new MigrationEventDispatcher();

/**
 * Helper functions to dispatch events
 */
export async function dispatchMigrationsStarted(method: 'up' | 'down'): Promise<void> {
  await migrationEvents.dispatch('migrations.started', {
    timestamp: new Date(),
    method,
  });
}

export async function dispatchMigrationsEnded(method: 'up' | 'down'): Promise<void> {
  await migrationEvents.dispatch('migrations.ended', {
    timestamp: new Date(),
    method,
  });
}

export async function dispatchMigrationStarted(migration: string, batch: number): Promise<void> {
  await migrationEvents.dispatch('migration.started', {
    timestamp: new Date(),
    migration,
    batch,
  });
}

export async function dispatchMigrationEnded(migration: string, batch: number, method: 'up' | 'down'): Promise<void> {
  await migrationEvents.dispatch('migration.ended', {
    timestamp: new Date(),
    migration,
    batch,
    method,
  });
}

export async function dispatchNoPendingMigrations(): Promise<void> {
  await migrationEvents.dispatch('migrations.none', {
    timestamp: new Date(),
  });
}

export async function dispatchSchemaDumped(path: string): Promise<void> {
  await migrationEvents.dispatch('schema.dumped', {
    timestamp: new Date(),
    path,
  });
}

export async function dispatchSchemaLoaded(path: string): Promise<void> {
  await migrationEvents.dispatch('schema.loaded', {
    timestamp: new Date(),
    path,
  });
}
