import { Migrator } from '../../../src/Migrations/Migrator';
import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// ---- Build mock connection ----
function mockConnection() {
  const tableQB: any = {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    selectRaw: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
  };

  const schema: any = {
    hasTable: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue(undefined),
  };

  const conn: any = {
    getDriverName: jest.fn().mockReturnValue('sqlite'),
    getSchemaBuilder: jest.fn().mockReturnValue(schema),
    table: jest.fn().mockReturnValue(tableQB),
    transaction: jest.fn().mockImplementation(async (cb: Function) => cb()),
    select: jest.fn().mockResolvedValue([]),
  };

  return { conn, tableQB, schema };
}

describe('Migrations / Migrator', () => {
  let migrator: Migrator;
  let conn: any;
  let tableQB: any;
  let schema: any;

  beforeEach(() => {
    const mocks = mockConnection();
    conn = mocks.conn;
    tableQB = mocks.tableQB;
    schema = mocks.schema;
    migrator = new Migrator(conn);
    jest.clearAllMocks();
  });

  // ---- setPaths / addPath ----
  test('setPaths sets migration paths', () => {
    migrator.setPaths(['/a', '/b']);
    expect((migrator as any).paths).toEqual(['/a', '/b']);
  });

  test('addPath appends to paths', () => {
    migrator.setPaths(['/a']);
    migrator.addPath('/b');
    expect((migrator as any).paths).toEqual(['/a', '/b']);
  });

  // ---- getMigrationFiles ----
  test('getMigrationFiles returns sorted .ts/.js files', () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([
      '002_create_posts.ts',
      '001_create_users.ts',
      'readme.md',
    ] as any);

    const files = (migrator as any).getMigrationFiles();
    expect(files.length).toBe(2);
    expect(files[0].name).toBe('001_create_users');
    expect(files[1].name).toBe('002_create_posts');
  });

  test('getMigrationFiles skips non-existent paths', () => {
    migrator.setPaths(['/nonexistent']);
    mockFs.existsSync.mockReturnValue(false);
    const files = (migrator as any).getMigrationFiles();
    expect(files.length).toBe(0);
  });

  // ---- run (no pending) ----
  test('run returns empty when no pending migrations', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts'] as any);

    // All migrations already ran
    tableQB.get.mockResolvedValue([{ migration: '001_init', batch: 1 }]);
    tableQB.first.mockResolvedValue({ max_batch: 1 });

    const results = await migrator.run();
    expect(results).toEqual([]);
  });

  // ---- run with pending ----
  test('run executes pending migrations', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts'] as any);

    // No migrations ran yet
    tableQB.get.mockResolvedValue([]);
    tableQB.first.mockResolvedValue({ max_batch: 0 });

    // Mock loadMigration
    jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue({
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    });

    const results = await migrator.run();
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
  });

  // ---- run with pretend ----
  test('run with pretend does not execute migration', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts'] as any);
    tableQB.get.mockResolvedValue([]);
    tableQB.first.mockResolvedValue({ max_batch: 0 });

    jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue({
      up: jest.fn(),
      down: jest.fn(),
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const results = await migrator.run({ pretend: true });
    expect(results[0].pretend).toBe(true);
    logSpy.mockRestore();
  });

  // ---- rollback ----
  test('rollback returns empty when no batches', async () => {
    tableQB.first.mockResolvedValue({ max_batch: 0 });
    const results = await migrator.rollback();
    expect(results).toEqual([]);
  });

  test('rollback runs down on last batch', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts'] as any);

    // last batch = 1
    tableQB.first.mockResolvedValue({ max_batch: 1 });
    // migrations in batch 1
    tableQB.get.mockResolvedValue([{ migration: '001_init', batch: 1 }]);

    const downFn = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue({
      up: jest.fn(),
      down: downFn,
    });

    const results = await migrator.rollback();
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(downFn).toHaveBeenCalled();
  });

  // ---- reset ----
  test('reset rolls back all migrations', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts', '002_posts.ts'] as any);

    tableQB.get.mockResolvedValue([
      { migration: '001_init', batch: 1 },
      { migration: '002_posts', batch: 2 },
    ]);

    jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue({
      up: jest.fn(),
      down: jest.fn().mockResolvedValue(undefined),
    });

    const results = await migrator.reset();
    expect(results.length).toBe(2);
  });

  // ---- status ----
  test('status returns migration status', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts', '002_posts.ts'] as any);

    tableQB.get.mockResolvedValue([{ migration: '001_init', batch: 1 }]);
    tableQB.first.mockResolvedValueOnce(null) // no table initially but mocked true
      .mockResolvedValueOnce({ batch: 1 }) // getBatchForMigration first
      .mockResolvedValueOnce(null); // getBatchForMigration second

    const statuses = await migrator.status();
    expect(statuses.length).toBe(2);
    expect(statuses[0].name).toBe('001_init');
  });

  // ---- createMigrationTable ----
  test('creates migration table if not exists', async () => {
    schema.hasTable.mockResolvedValue(false);
    await (migrator as any).createMigrationTable();
    expect(schema.create).toHaveBeenCalledWith('migrations', expect.any(Function));
  });

  test('skips creation if table exists', async () => {
    schema.hasTable.mockResolvedValue(true);
    await (migrator as any).createMigrationTable();
    expect(schema.create).not.toHaveBeenCalled();
  });

  // ---- logMigration / removeMigrationLog ----
  test('logMigration inserts record', async () => {
    await (migrator as any).logMigration('001_init', 1);
    expect(tableQB.insert).toHaveBeenCalledWith({ migration: '001_init', batch: 1 });
  });

  test('removeMigrationLog deletes record', async () => {
    await (migrator as any).removeMigrationLog('001_init');
    expect(tableQB.where).toHaveBeenCalledWith('migration', '001_init');
    expect(tableQB.delete).toHaveBeenCalled();
  });

  // ---- batch numbers ----
  test('getNextBatchNumber returns max+1', async () => {
    tableQB.first.mockResolvedValue({ max_batch: 3 });
    const next = await (migrator as any).getNextBatchNumber();
    expect(next).toBe(4);
  });

  test('getNextBatchNumber returns 1 when no batches', async () => {
    tableQB.first.mockResolvedValue(null);
    const next = await (migrator as any).getNextBatchNumber();
    expect(next).toBe(1);
  });

  test('getLastBatchNumber returns max', async () => {
    tableQB.first.mockResolvedValue({ max_batch: 5 });
    const last = await (migrator as any).getLastBatchNumber();
    expect(last).toBe(5);
  });

  test('getBatchForMigration returns batch or null', async () => {
    tableQB.first.mockResolvedValue({ batch: 2 });
    expect(await (migrator as any).getBatchForMigration('test')).toBe(2);

    tableQB.first.mockResolvedValue(null);
    expect(await (migrator as any).getBatchForMigration('missing')).toBeNull();
  });

  // ---- error handling ----
  test('runMigration catches errors', async () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['001_init.ts'] as any);
    tableQB.get.mockResolvedValue([]);
    tableQB.first.mockResolvedValue({ max_batch: 0 });

    jest.spyOn(migrator as any, 'loadMigration').mockRejectedValue(new Error('Load failed'));

    const results = await migrator.run();
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Load failed');
  });
});
