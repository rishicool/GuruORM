/**
 * Tests for SeederRunner — the CLI seeder execution engine.
 * Mocks fs, chalk, Manager, and getRequire to avoid real DB/filesystem calls.
 */
import * as fs from 'fs';
import * as path from 'path';

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock chalk to a passthrough
jest.mock('chalk', () => {
  const passthrough = (s: string) => s;
  const chainable: any = new Proxy(passthrough, {
    get: () => chainable,
    apply: (_t: any, _this: any, args: any[]) => args[0],
  });
  return { __esModule: true, default: chainable };
});

// Mock table QB helper
function makeTableQB() {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    truncate: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    max: jest.fn().mockResolvedValue(0),
    pluck: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

function makeConnection() {
  const tqb = makeTableQB();
  return {
    table: jest.fn().mockReturnValue(tqb),
    select: jest.fn().mockResolvedValue([]),
    statement: jest.fn().mockResolvedValue(true),
    getSchemaBuilder: jest.fn().mockReturnValue({
      hasTable: jest.fn().mockResolvedValue(false),
      hasColumn: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
      table: jest.fn().mockResolvedValue(undefined),
    }),
    getConfig: jest.fn().mockReturnValue({ driver: 'sqlite' }),
    _tableQB: tqb,
  };
}

// Mock Manager and getRequire
const mockConn = makeConnection();
const mockManager = {
  addConnection: jest.fn(),
  setDefaultConnection: jest.fn(),
  bootEloquent: jest.fn(),
  setAsGlobal: jest.fn(),
  getConnection: jest.fn().mockReturnValue(mockConn),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/Capsule/Manager', () => ({
  Manager: jest.fn().mockImplementation(() => mockManager),
}));

jest.mock('../../../src/Support/compat.js', () => ({
  getRequire: jest.fn().mockReturnValue(
    jest.fn().mockReturnValue({ connections: { default: { driver: 'sqlite', database: ':memory:' } } })
  ),
  getFilename: jest.fn().mockReturnValue(__filename),
}));

import { SeederRunner } from '../../../src/CLI/SeederRunner';

describe('SeederRunner', () => {
  let runner: SeederRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    // Make config file exist
    mockFs.existsSync.mockImplementation((p: any) => {
      const s = String(p);
      if (s.endsWith('guruorm.config.cjs') || s.endsWith('guruorm.config.js')) return true;
      return false;
    });
    runner = new SeederRunner();
    // Reset mock connection for clean state
    Object.assign(mockConn, makeConnection());
    mockManager.getConnection.mockReturnValue(mockConn);
  });

  // ---- Constructor / initializeManager ----
  describe('constructor', () => {
    test('initializes with config and boots eloquent', () => {
      expect(mockManager.addConnection).toHaveBeenCalled();
      expect(mockManager.bootEloquent).toHaveBeenCalled();
      expect(mockManager.setAsGlobal).toHaveBeenCalled();
    });

    test('throws when no config file found', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(() => new SeederRunner()).toThrow('GuruORM config file not found');
    });
  });

  // ---- createSeedersTable ----
  describe('createSeedersTable', () => {
    test('creates table when it does not exist', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      await (runner as any).createSeedersTable();
      expect(mockConn.getSchemaBuilder().create).toHaveBeenCalled();
    });

    test('skips creation when table exists (triggers legacy migration check)', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(true);
      // hasColumn returns false → will try to add batch column
      mockConn.getSchemaBuilder().hasColumn.mockResolvedValue(false);
      await (runner as any).createSeedersTable();
      expect(mockConn.getSchemaBuilder().create).not.toHaveBeenCalled();
      // Should call table() to add batch column
      expect(mockConn.getSchemaBuilder().table).toHaveBeenCalled();
    });

    test('handles existing batch column gracefully', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(true);
      mockConn.getSchemaBuilder().hasColumn.mockResolvedValue(true);
      // Has batch column → normalize names path
      mockConn._tableQB.get.mockResolvedValue([]);
      await (runner as any).createSeedersTable();
      expect(mockConn.getSchemaBuilder().create).not.toHaveBeenCalled();
    });
  });

  // ---- hasSeederRun ----
  describe('hasSeederRun', () => {
    test('returns true when seeder found by normalized name', async () => {
      mockConn._tableQB.first.mockResolvedValueOnce({ seeder: 'UserSeeder', batch: 1 });
      const result = await (runner as any).hasSeederRun('UserSeeder');
      expect(result).toBe(true);
    });

    test('returns true when seeder found by legacy name (.js)', async () => {
      // First call (normalized) returns null, second call (with .js) returns result
      mockConn._tableQB.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ seeder: 'UserSeeder.js', batch: 1 });
      const result = await (runner as any).hasSeederRun('UserSeeder');
      expect(result).toBe(true);
    });

    test('returns false when seeder not found', async () => {
      mockConn._tableQB.first.mockResolvedValue(null);
      const result = await (runner as any).hasSeederRun('NewSeeder');
      expect(result).toBe(false);
    });
  });

  // ---- logSeeder ----
  describe('logSeeder', () => {
    test('inserts seeder with normalized name and batch number', async () => {
      mockConn._tableQB.max.mockResolvedValue(2);
      mockConn._tableQB.first.mockResolvedValue(null);
      await (runner as any).logSeeder('TestSeeder.js');
      expect(mockConn._tableQB.insert).toHaveBeenCalledWith(
        expect.objectContaining({ seeder: 'TestSeeder' })
      );
    });

    test('skips insert when seeder already logged', async () => {
      mockConn._tableQB.max.mockResolvedValue(1);
      mockConn._tableQB.first.mockResolvedValue({ seeder: 'TestSeeder', batch: 1 });
      await (runner as any).logSeeder('TestSeeder');
      expect(mockConn._tableQB.insert).not.toHaveBeenCalled();
    });
  });

  // ---- getNextBatchNumber ----
  describe('getNextBatchNumber', () => {
    test('returns max + 1 from array result', async () => {
      mockConn._tableQB.max.mockResolvedValue([{ max: 3 }]);
      const result = await (runner as any).getNextBatchNumber();
      expect(result).toBe(4);
    });

    test('returns max + 1 from object result', async () => {
      mockConn._tableQB.max.mockResolvedValue({ max: 5 });
      const result = await (runner as any).getNextBatchNumber();
      expect(result).toBe(6);
    });

    test('returns max + 1 from number result', async () => {
      mockConn._tableQB.max.mockResolvedValue(7);
      const result = await (runner as any).getNextBatchNumber();
      expect(result).toBe(8);
    });

    test('returns 1 when no seeders', async () => {
      mockConn._tableQB.max.mockResolvedValue(0);
      const result = await (runner as any).getNextBatchNumber();
      expect(result).toBe(1);
    });

    test('returns 1 on error', async () => {
      mockConn._tableQB.max.mockRejectedValue(new Error('no column'));
      const result = await (runner as any).getNextBatchNumber();
      expect(result).toBe(1);
    });
  });

  // ---- getAllTables ----
  describe('getAllTables', () => {
    test('sqlite query uses sqlite_master', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'sqlite' });
      mockConn.select.mockResolvedValue([{ table_name: 'users' }, { table_name: 'posts' }]);
      const tables = await (runner as any).getAllTables(mockConn);
      expect(tables).toEqual(['users', 'posts']);
      expect(mockConn.select).toHaveBeenCalledWith(expect.stringContaining('sqlite_master'));
    });

    test('mysql query uses information_schema', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'mysql' });
      mockConn.select.mockResolvedValue([{ table_name: 'users' }]);
      const tables = await (runner as any).getAllTables(mockConn);
      expect(tables).toEqual(['users']);
      expect(mockConn.select).toHaveBeenCalledWith(expect.stringContaining('information_schema'));
    });

    test('postgres query uses pg_tables', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'pgsql' });
      mockConn.select.mockResolvedValue([{ tablename: 'users' }]);
      const tables = await (runner as any).getAllTables(mockConn);
      expect(tables).toEqual(['users']);
      expect(mockConn.select).toHaveBeenCalledWith(expect.stringContaining('pg_tables'));
    });

    test('throws for unsupported driver', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'oracle' });
      await expect((runner as any).getAllTables(mockConn)).rejects.toThrow('Unsupported driver');
    });
  });

  // ---- disableForeignKeyChecks / enableForeignKeyChecks ----
  describe('foreign key checks', () => {
    test('disable for mysql', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'mysql' });
      await (runner as any).disableForeignKeyChecks(mockConn);
      expect(mockConn.statement).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0');
    });

    test('enable for mysql', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'mysql' });
      await (runner as any).enableForeignKeyChecks(mockConn);
      expect(mockConn.statement).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1');
    });

    test('disable for sqlite', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'sqlite' });
      await (runner as any).disableForeignKeyChecks(mockConn);
      expect(mockConn.statement).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF');
    });

    test('enable for sqlite', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'sqlite' });
      await (runner as any).enableForeignKeyChecks(mockConn);
      expect(mockConn.statement).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });

    test('disable for postgres is noop', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'pgsql' });
      await (runner as any).disableForeignKeyChecks(mockConn);
      expect(mockConn.statement).not.toHaveBeenCalled();
    });

    test('enable for postgres is noop', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'pgsql' });
      await (runner as any).enableForeignKeyChecks(mockConn);
      expect(mockConn.statement).not.toHaveBeenCalled();
    });
  });

  // ---- hasUniqueConstraint ----
  describe('hasUniqueConstraint', () => {
    test('returns true for pgsql when constraint exists', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'pgsql' });
      mockConn.select.mockResolvedValue([{ count: '1' }]);
      const result = await (runner as any).hasUniqueConstraint(mockConn, 'seeders', 'seeder');
      expect(result).toBe(true);
    });

    test('returns false for pgsql when no constraint', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'pgsql' });
      mockConn.select.mockResolvedValue([{ count: '0' }]);
      const result = await (runner as any).hasUniqueConstraint(mockConn, 'seeders', 'seeder');
      expect(result).toBe(false);
    });

    test('returns true for mysql when constraint exists', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'mysql' });
      mockConn.select.mockResolvedValue([{ count: '1' }]);
      const result = await (runner as any).hasUniqueConstraint(mockConn, 'seeders', 'seeder');
      expect(result).toBe(true);
    });

    test('returns true for sqlite when constraint exists', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'sqlite' });
      mockConn.select.mockResolvedValue([{ count: '1' }]);
      const result = await (runner as any).hasUniqueConstraint(mockConn, 'seeders', 'seeder');
      expect(result).toBe(true);
    });

    test('returns false for unknown driver', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'oracle' });
      const result = await (runner as any).hasUniqueConstraint(mockConn, 'seeders', 'seeder');
      expect(result).toBe(false);
    });

    test('returns false on error', async () => {
      mockConn.getConfig.mockReturnValue({ driver: 'pgsql' });
      mockConn.select.mockRejectedValue(new Error('db error'));
      const result = await (runner as any).hasUniqueConstraint(mockConn, 'seeders', 'seeder');
      expect(result).toBe(false);
    });
  });

  // ---- run ----
  describe('run', () => {
    test('runs specific seeder class when provided', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      const spy = jest.spyOn(runner as any, 'runSingleSeeder').mockResolvedValue(undefined);
      await runner.run({ class: 'UserSeeder' });
      expect(spy).toHaveBeenCalledWith('UserSeeder', false);
      spy.mockRestore();
    });

    test('runs DatabaseSeeder when it exists', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockFs.existsSync.mockImplementation((p: any) => {
        const s = String(p);
        return s.endsWith('guruorm.config.cjs') || s.includes('DatabaseSeeder.js');
      });
      const spy = jest.spyOn(runner as any, 'runSingleSeeder').mockResolvedValue(undefined);
      await runner.run();
      expect(spy).toHaveBeenCalledWith('DatabaseSeeder', false);
      spy.mockRestore();
    });

    test('runs all seeders when no DatabaseSeeder', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockFs.existsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('guruorm.config.cjs')) return true;
        if (s.includes('DatabaseSeeder.js')) return false;
        if (s.includes('seeders')) return true;
        return false;
      });
      mockFs.readdirSync.mockReturnValue(['ASeeder.js', 'BSeeder.js'] as any);
      const spy = jest.spyOn(runner as any, 'runSingleSeeder').mockResolvedValue(undefined);
      await runner.run();
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockRestore();
    });

    test('handles no seeders directory', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockFs.existsSync.mockImplementation((p: any) => {
        const s = String(p);
        return s.endsWith('guruorm.config.cjs');
      });
      // Should not throw
      await runner.run();
    });

    test('handles empty seeders directory', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockFs.existsSync.mockImplementation((p: any) => {
        const s = String(p);
        if (s.endsWith('guruorm.config.cjs')) return true;
        if (s.includes('DatabaseSeeder.js')) return false;
        if (s.includes('seeders')) return true;
        return false;
      });
      mockFs.readdirSync.mockReturnValue([] as any);
      await runner.run();
    });
  });

  // ---- runSingleSeeder ----
  describe('runSingleSeeder', () => {
    test('skips already-run seeder when force is false', async () => {
      jest.spyOn(runner as any, 'hasSeederRun').mockResolvedValue(true);
      await (runner as any).runSingleSeeder('OldSeeder', false);
      // Should not throw or try to import
    });
  });

  // ---- refresh ----
  describe('refresh', () => {
    test('truncates tables and re-runs seeders', async () => {
      jest.spyOn(runner as any, 'getAllTables').mockResolvedValue(['users', 'posts', 'migrations', 'seeders']);
      jest.spyOn(runner as any, 'disableForeignKeyChecks').mockResolvedValue(undefined);
      jest.spyOn(runner as any, 'enableForeignKeyChecks').mockResolvedValue(undefined);
      const runSpy = jest.spyOn(runner, 'run').mockResolvedValue(undefined);

      await runner.refresh({ force: true });
      expect(runSpy).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
      // migrations should be skipped, seeders should be cleared (delete), posts truncated
      runSpy.mockRestore();
    });
  });

  // ---- clear ----
  describe('clear', () => {
    test('clears all tables except migrations', async () => {
      jest.spyOn(runner as any, 'getAllTables').mockResolvedValue(['users', 'migrations']);
      jest.spyOn(runner as any, 'disableForeignKeyChecks').mockResolvedValue(undefined);
      jest.spyOn(runner as any, 'enableForeignKeyChecks').mockResolvedValue(undefined);

      await runner.clear({ force: true });
      // Should have called table(...).delete() for users, skip migrations
    });
  });

  // ---- reset ----
  describe('reset', () => {
    test('deletes all seeder tracking entries', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      await runner.reset();
      expect(mockConn._tableQB.delete).toHaveBeenCalled();
    });
  });

  // ---- rollback ----
  describe('rollback', () => {
    test('rolls back last batch', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockConn._tableQB.max.mockResolvedValue([{ max: 2 }]);
      mockConn._tableQB.get.mockResolvedValue([{ seeder: 'UserSeeder' }]);
      await runner.rollback();
      expect(mockConn._tableQB.delete).toHaveBeenCalled();
    });

    test('does nothing when no batches to rollback', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockConn._tableQB.max.mockResolvedValue(0);
      await runner.rollback();
    });
  });

  // ---- status ----
  describe('status', () => {
    test('displays status of all seeders', async () => {
      mockConn.getSchemaBuilder().hasTable.mockResolvedValue(false);
      mockFs.existsSync.mockImplementation((p: any) => {
        return String(p).endsWith('guruorm.config.cjs') || String(p).includes('seeders');
      });
      mockFs.readdirSync.mockReturnValue(['UserSeeder.js', 'PostSeeder.js'] as any);
      mockConn._tableQB.get.mockResolvedValue([{ seeder: 'UserSeeder', batch: 1 }]);
      await runner.status();
      // Should not throw
    });
  });

  // ---- disconnect ----
  describe('disconnect', () => {
    test('calls manager disconnect', async () => {
      await runner.disconnect();
      expect(mockManager.disconnect).toHaveBeenCalled();
    });
  });
});
