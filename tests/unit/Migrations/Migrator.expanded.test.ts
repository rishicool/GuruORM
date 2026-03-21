import * as fs from 'fs';
import { Migrator } from '../../../src/Migrations/Migrator';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock the entire MigrationEvents module to avoid side effects
jest.mock('../../../src/Migrations/MigrationEvents', () => ({
  dispatchMigrationsStarted: jest.fn().mockResolvedValue(undefined),
  dispatchMigrationsEnded: jest.fn().mockResolvedValue(undefined),
  dispatchMigrationStarted: jest.fn().mockResolvedValue(undefined),
  dispatchMigrationEnded: jest.fn().mockResolvedValue(undefined),
  dispatchNoPendingMigrations: jest.fn().mockResolvedValue(undefined),
}));

function makeTableQB() {
  const qb: any = {
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectRaw: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue({ max_batch: 0 }),
    pluck: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

function makeConnection() {
  const tqb = makeTableQB();
  return {
    table: jest.fn().mockReturnValue(tqb),
    getSchemaBuilder: jest.fn().mockReturnValue({
      hasTable: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
    }),
    getDriverName: jest.fn().mockReturnValue('sqlite'),
    transaction: jest.fn(async (cb: Function) => { await cb(); }),
    _tableQB: tqb,
  };
}

describe('Migrator — expanded coverage', () => {
  let migrator: Migrator;
  let conn: ReturnType<typeof makeConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    conn = makeConnection();
    migrator = new Migrator(conn as any);
  });

  test('setPaths sets and addPath appends', () => {
    migrator.setPaths(['/a', '/b']);
    expect((migrator as any).paths).toEqual(['/a', '/b']);

    migrator.addPath('/c');
    expect((migrator as any).paths).toEqual(['/a', '/b', '/c']);
  });

  test('getMigrationFiles reads and sorts .js files from all paths', () => {
    migrator.setPaths(['/migrations']);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([
      '2024_01_02_create_posts.js',
      '2024_01_01_create_users.js',
      'readme.md',
    ] as any);

    const files = (migrator as any).getMigrationFiles();
    expect(files).toHaveLength(2);
    // Sorted by name
    expect(files[0].name).toBe('2024_01_01_create_users');
    expect(files[1].name).toBe('2024_01_02_create_posts');
  });

  test('getMigrationFiles skips non-existent paths', () => {
    migrator.setPaths(['/missing']);
    mockFs.existsSync.mockReturnValue(false);

    const files = (migrator as any).getMigrationFiles();
    expect(files).toEqual([]);
  });

  describe('run', () => {
    beforeEach(() => {
      migrator.setPaths(['/migs']);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_create_users.js'] as any);
    });

    test('run with no pending migrations dispatches noPending', async () => {
      // getRanMigrations returns all files as already ran
      conn._tableQB.get.mockResolvedValue([{ migration: '001_create_users' }]);
      const results = await migrator.run();
      expect(results).toEqual([]);
    });

    test('run with pending migrations runs them', async () => {
      // getRanMigrations returns empty (no migrations ran yet)
      conn._tableQB.get.mockResolvedValue([]);
      // getNextBatchNumber returns max_batch=0 → next=1
      conn._tableQB.first.mockResolvedValue({ max_batch: 0 });

      const mockMigration = { up: jest.fn().mockResolvedValue(undefined), down: jest.fn() };
      jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue(mockMigration);

      const results = await migrator.run();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockMigration.up).toHaveBeenCalled();
    });

    test('run with pretend option does not execute migration', async () => {
      conn._tableQB.get.mockResolvedValue([]);
      conn._tableQB.first.mockResolvedValue({ max_batch: 0 });

      const mockMigration = { up: jest.fn(), down: jest.fn() };
      jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue(mockMigration);

      const results = await migrator.run({ pretend: true });
      expect(results).toHaveLength(1);
      expect(results[0].pretend).toBe(true);
      expect(mockMigration.up).not.toHaveBeenCalled();
    });

    test('run captures error from migration', async () => {
      conn._tableQB.get.mockResolvedValue([]);
      conn._tableQB.first.mockResolvedValue({ max_batch: 0 });

      jest.spyOn(migrator as any, 'loadMigration').mockRejectedValue(new Error('load fail'));

      const results = await migrator.run();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('load fail');
    });
  });

  describe('rollback', () => {
    test('rollback with no batches returns empty', async () => {
      conn._tableQB.first.mockResolvedValue({ max_batch: 0 });
      const results = await migrator.rollback();
      expect(results).toEqual([]);
    });

    test('rollback rolls back last batch in reverse', async () => {
      migrator.setPaths(['/migs']);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_create_users.js'] as any);

      // getLastBatchNumber returns 2
      conn._tableQB.first.mockResolvedValue({ max_batch: 2 });
      conn._tableQB.get.mockResolvedValue([
        { migration: '001_create_users', batch: 2 },
      ]);

      const mockMigration = { up: jest.fn(), down: jest.fn().mockResolvedValue(undefined) };
      jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue(mockMigration);

      const results = await migrator.rollback();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockMigration.down).toHaveBeenCalled();
    });

    test('rollback with pretend does not execute down', async () => {
      migrator.setPaths(['/migs']);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_create_users.js'] as any);

      conn._tableQB.first.mockResolvedValue({ max_batch: 1 });
      conn._tableQB.get.mockResolvedValue([
        { migration: '001_create_users', batch: 1 },
      ]);

      const mockMigration = { up: jest.fn(), down: jest.fn() };
      jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue(mockMigration);

      const results = await migrator.rollback({ pretend: true });
      expect(results[0].pretend).toBe(true);
      expect(mockMigration.down).not.toHaveBeenCalled();
    });

    test('rollback errors are captured', async () => {
      migrator.setPaths(['/migs']);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([] as any);

      conn._tableQB.first.mockResolvedValue({ max_batch: 1 });
      conn._tableQB.get.mockResolvedValue([
        { migration: 'missing_migration', batch: 1 },
      ]);

      const results = await migrator.rollback();
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('not found');
    });
  });

  describe('reset', () => {
    test('reset rolls back all migrations in reverse', async () => {
      migrator.setPaths(['/migs']);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_create_users.js'] as any);

      conn._tableQB.get.mockResolvedValue([
        { migration: '001_create_users', batch: 1 },
      ]);

      const mockMigration = { up: jest.fn(), down: jest.fn().mockResolvedValue(undefined) };
      jest.spyOn(migrator as any, 'loadMigration').mockResolvedValue(mockMigration);

      const results = await migrator.reset();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('status', () => {
    test('status returns ran status for each file', async () => {
      migrator.setPaths(['/migs']);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001_create_users.js', '002_create_posts.js'] as any);

      // getRanMigrations — .get() returns migration records
      conn._tableQB.get.mockResolvedValue([{ migration: '001_create_users' }]);
      // getBatchForMigration — .first() returns batch or null
      conn._tableQB.first.mockResolvedValue(null);

      const statuses = await migrator.status();
      expect(statuses).toHaveLength(2);
      expect(statuses[0].ran).toBe(true);
      expect(statuses[1].ran).toBe(false);
    });
  });

  describe('createMigrationTable', () => {
    test('creates table when it does not exist', async () => {
      const schema = conn.getSchemaBuilder();
      schema.hasTable.mockResolvedValue(false);

      await (migrator as any).createMigrationTable();
      expect(schema.create).toHaveBeenCalled();
    });

    test('skips creation when table exists', async () => {
      const schema = conn.getSchemaBuilder();
      schema.hasTable.mockResolvedValue(true);

      await (migrator as any).createMigrationTable();
      expect(schema.create).not.toHaveBeenCalled();
    });
  });

  describe('logMigration and removeMigrationLog', () => {
    test('logMigration inserts into migration table', async () => {
      await (migrator as any).logMigration('create_users', 3);
      expect(conn.table).toHaveBeenCalledWith('migrations');
      expect(conn._tableQB.insert).toHaveBeenCalledWith({
        migration: 'create_users',
        batch: 3,
      });
    });

    test('removeMigrationLog deletes from migration table', async () => {
      await (migrator as any).removeMigrationLog('create_users');
      expect(conn._tableQB.where).toHaveBeenCalledWith('migration', 'create_users');
      expect(conn._tableQB.delete).toHaveBeenCalled();
    });
  });

  describe('batch number helpers', () => {
    test('getNextBatchNumber returns max + 1', async () => {
      conn._tableQB.first.mockResolvedValue({ max_batch: 5 });
      const next = await (migrator as any).getNextBatchNumber();
      expect(next).toBe(6);
    });

    test('getNextBatchNumber returns 1 when no migrations', async () => {
      conn._tableQB.first.mockResolvedValue(null);
      const next = await (migrator as any).getNextBatchNumber();
      expect(next).toBe(1);
    });

    test('getLastBatchNumber returns the max batch', async () => {
      conn._tableQB.first.mockResolvedValue({ max_batch: 3 });
      const last = await (migrator as any).getLastBatchNumber();
      expect(last).toBe(3);
    });

    test('getLastBatchNumber returns 0 when none', async () => {
      conn._tableQB.first.mockResolvedValue(null);
      const last = await (migrator as any).getLastBatchNumber();
      expect(last).toBe(0);
    });
  });

  // ---- loadMigration branches (lines 247-312) ----
  describe('loadMigration', () => {
    test('loads CJS default export class', async () => {
      class FakeMigration { async up() {} async down() {} }
      jest.doMock('/tmp/fake_cjs_default.ts', () => ({ default: FakeMigration }), { virtual: true });
      const result = await (migrator as any).loadMigration({ name: 'fake_cjs_default', path: '/tmp/fake_cjs_default.ts' });
      expect(result).toBeInstanceOf(FakeMigration);
      jest.dontMock('/tmp/fake_cjs_default.ts');
    });

    test('loads CJS default export object with up/down', async () => {
      const obj = { up: async () => {}, down: async () => {} };
      jest.doMock('/tmp/fake_cjs_obj.ts', () => ({ default: obj }), { virtual: true });
      const result = await (migrator as any).loadMigration({ name: 'fake_cjs_obj', path: '/tmp/fake_cjs_obj.ts' });
      expect(result).toBe(obj);
      jest.dontMock('/tmp/fake_cjs_obj.ts');
    });

    test('loads ESM function exports (up/down without default)', async () => {
      const up = jest.fn();
      const down = jest.fn();
      jest.doMock('/tmp/fake_esm_fn.ts', () => ({ up, down }), { virtual: true });
      const result = await (migrator as any).loadMigration({ name: 'fake_esm_fn', path: '/tmp/fake_esm_fn.ts' });
      expect(result.up).toBeDefined();
      expect(result.down).toBeDefined();
      jest.dontMock('/tmp/fake_esm_fn.ts');
    });

    test('loads direct function export (module.exports = Class)', async () => {
      class Direct { async up() {} async down() {} }
      jest.doMock('/tmp/fake_direct.ts', () => Direct, { virtual: true });
      const result = await (migrator as any).loadMigration({ name: 'fake_direct', path: '/tmp/fake_direct.ts' });
      expect(result).toBeInstanceOf(Direct);
      jest.dontMock('/tmp/fake_direct.ts');
    });

    test('loads named export class', async () => {
      class MyMigration { async up() {} async down() {} }
      jest.doMock('/tmp/fake_named.ts', () => ({ MyMigration }), { virtual: true });
      const result = await (migrator as any).loadMigration({ name: 'fake_named', path: '/tmp/fake_named.ts' });
      expect(result).toBeInstanceOf(MyMigration);
      jest.dontMock('/tmp/fake_named.ts');
    });

    test('throws for invalid default export', async () => {
      jest.doMock('/tmp/fake_invalid_default.ts', () => ({ default: 'not a class' }), { virtual: true });
      await expect((migrator as any).loadMigration({ name: 'fake_invalid_default', path: '/tmp/fake_invalid_default.ts' }))
        .rejects.toThrow('Invalid migration format');
      jest.dontMock('/tmp/fake_invalid_default.ts');
    });

    test('throws for module with no valid exports', async () => {
      jest.doMock('/tmp/fake_empty.ts', () => ({ nothing: 'here' }), { virtual: true });
      await expect((migrator as any).loadMigration({ name: 'fake_empty', path: '/tmp/fake_empty.ts' }))
        .rejects.toThrow('Invalid migration format');
      jest.dontMock('/tmp/fake_empty.ts');
    });
  });

  // ---- createMigrationTable when table already exists (line 332-334) ----
  describe('createMigrationTable', () => {
    test('skips creation when table already exists', async () => {
      conn.getSchemaBuilder().hasTable.mockResolvedValue(true);
      await (migrator as any).createMigrationTable();
      expect(conn.getSchemaBuilder().create).not.toHaveBeenCalled();
    });
  });
});
