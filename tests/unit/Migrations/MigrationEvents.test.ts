import {
  MigrationEventDispatcher,
  migrationEvents,
  dispatchMigrationsStarted,
  dispatchMigrationsEnded,
  dispatchMigrationStarted,
  dispatchMigrationEnded,
  dispatchNoPendingMigrations,
  dispatchSchemaDumped,
  dispatchSchemaLoaded,
} from '../../../src/Migrations/MigrationEvents';

describe('MigrationEventDispatcher', () => {
  let dispatcher: MigrationEventDispatcher;

  beforeEach(() => {
    dispatcher = new MigrationEventDispatcher();
  });

  test('listen and dispatch fires handler', async () => {
    let data: any = null;
    dispatcher.listen('migrations.started', (e) => { data = e; });

    await dispatcher.dispatch('migrations.started', { method: 'up' });
    expect(data).toEqual({ method: 'up' });
  });

  test('dispatch fires multiple handlers in order', async () => {
    const order: number[] = [];
    dispatcher.listen('migration.ended', () => { order.push(1); });
    dispatcher.listen('migration.ended', () => { order.push(2); });

    await dispatcher.dispatch('migration.ended', {});
    expect(order).toEqual([1, 2]);
  });

  test('dispatch does nothing when no listeners', async () => {
    await expect(dispatcher.dispatch('migrations.none', {})).resolves.toBeUndefined();
  });

  test('forget removes listeners for a specific event', () => {
    dispatcher.listen('schema.dumped', jest.fn());
    expect(dispatcher.hasListeners('schema.dumped')).toBe(true);

    dispatcher.forget('schema.dumped');
    expect(dispatcher.hasListeners('schema.dumped')).toBe(false);
  });

  test('flush removes all listeners', () => {
    dispatcher.listen('migrations.started', jest.fn());
    dispatcher.listen('migration.started', jest.fn());
    dispatcher.flush();
    expect(dispatcher.hasListeners('migrations.started')).toBe(false);
    expect(dispatcher.hasListeners('migration.started')).toBe(false);
  });

  test('getListeners returns handlers for event', () => {
    const handler = jest.fn();
    dispatcher.listen('migrations.ended', handler);
    expect(dispatcher.getListeners('migrations.ended')).toEqual([handler]);
  });

  test('getListeners returns empty for unknown event', () => {
    expect(dispatcher.getListeners('schema.loaded')).toEqual([]);
  });

  test('hasListeners returns false for unknown event', () => {
    expect(dispatcher.hasListeners('schema.loaded')).toBe(false);
  });
});

describe('Migration event helper functions', () => {
  beforeEach(() => {
    migrationEvents.flush();
  });

  test('dispatchMigrationsStarted fires with timestamp and method', async () => {
    let data: any = null;
    migrationEvents.listen('migrations.started', (e) => { data = e; });

    await dispatchMigrationsStarted('up');
    expect(data).toBeTruthy();
    expect(data.method).toBe('up');
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  test('dispatchMigrationsEnded fires with timestamp and method', async () => {
    let data: any = null;
    migrationEvents.listen('migrations.ended', (e) => { data = e; });

    await dispatchMigrationsEnded('down');
    expect(data.method).toBe('down');
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  test('dispatchMigrationStarted fires with migration and batch', async () => {
    let data: any = null;
    migrationEvents.listen('migration.started', (e) => { data = e; });

    await dispatchMigrationStarted('create_users_table', 3);
    expect(data.migration).toBe('create_users_table');
    expect(data.batch).toBe(3);
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  test('dispatchMigrationEnded fires with migration, batch, and method', async () => {
    let data: any = null;
    migrationEvents.listen('migration.ended', (e) => { data = e; });

    await dispatchMigrationEnded('create_posts_table', 2, 'up');
    expect(data.migration).toBe('create_posts_table');
    expect(data.batch).toBe(2);
    expect(data.method).toBe('up');
  });

  test('dispatchNoPendingMigrations fires with timestamp', async () => {
    let data: any = null;
    migrationEvents.listen('migrations.none', (e) => { data = e; });

    await dispatchNoPendingMigrations();
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  test('dispatchSchemaDumped fires with path', async () => {
    let data: any = null;
    migrationEvents.listen('schema.dumped', (e) => { data = e; });

    await dispatchSchemaDumped('/dumps/schema.sql');
    expect(data.path).toBe('/dumps/schema.sql');
    expect(data.timestamp).toBeInstanceOf(Date);
  });

  test('dispatchSchemaLoaded fires with path', async () => {
    let data: any = null;
    migrationEvents.listen('schema.loaded', (e) => { data = e; });

    await dispatchSchemaLoaded('/dumps/schema.sql');
    expect(data.path).toBe('/dumps/schema.sql');
    expect(data.timestamp).toBeInstanceOf(Date);
  });
});
