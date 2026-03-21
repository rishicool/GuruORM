import { Seeder, DatabaseSeeder, JSONSeeder } from '../../../src/Seeding/Seeder';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock Manager — JSONSeeder uses Manager.getInstance()
jest.mock('../../../src/Capsule/Manager', () => ({
  Manager: {
    getInstance: jest.fn().mockReturnValue({
      getConnection: jest.fn().mockReturnValue({
        table: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(0),
          insert: jest.fn().mockResolvedValue(true),
        }),
      }),
    }),
  },
}));

describe('Seeding / Seeder', () => {
  // ---- Concrete Seeder ----
  test('can create concrete seeder', () => {
    class TestSeeder extends Seeder {
      async run() { /* noop */ }
    }
    const s = new TestSeeder();
    expect(s).toBeDefined();
  });

  test('getConnection returns undefined by default', () => {
    class TestSeeder extends Seeder {
      async run() {}
    }
    expect(new TestSeeder().getConnection()).toBeUndefined();
  });

  test('call runs another seeder', async () => {
    const ran: string[] = [];
    class ChildSeeder extends Seeder {
      async run() { ran.push('child'); }
    }
    class ParentSeeder extends Seeder {
      async run() {
        await this.call(ChildSeeder);
      }
    }
    await new ParentSeeder().run();
    expect(ran).toContain('child');
  });

  test('call runs array of seeders', async () => {
    const ran: string[] = [];
    class Seeder1 extends Seeder { async run() { ran.push('1'); } }
    class Seeder2 extends Seeder { async run() { ran.push('2'); } }
    class ParentSeeder extends Seeder {
      async run() {
        await this.call([Seeder1, Seeder2] as any);
      }
    }
    await new ParentSeeder().run();
    expect(ran).toEqual(['1', '2']);
  });

  test('callWith with silent option suppresses events', async () => {
    const ran: string[] = [];
    class ChildSeeder extends Seeder { async run() { ran.push('silent'); } }
    class ParentSeeder extends Seeder {
      async run() {
        await this.callWith(ChildSeeder, { silent: true });
      }
    }
    await new ParentSeeder().run();
    expect(ran).toContain('silent');
  });

  test('callWith without silent runs normally', async () => {
    const ran: string[] = [];
    class ChildSeeder extends Seeder { async run() { ran.push('normal'); } }
    class ParentSeeder extends Seeder {
      async run() {
        await this.callWith(ChildSeeder, {});
      }
    }
    await new ParentSeeder().run();
    expect(ran).toContain('normal');
  });
});

describe('Seeding / DatabaseSeeder', () => {
  test('DatabaseSeeder.run logs message', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const ds = new DatabaseSeeder();
    await ds.run();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Override'));
    logSpy.mockRestore();
  });
});

describe('Seeding / JSONSeeder', () => {
  class TestJSONSeeder extends JSONSeeder {
    constructor() {
      super('users', 'users', '/mock/seeds');
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('constructor sets tableName and jsonFileName', () => {
    const s = new TestJSONSeeder();
    expect((s as any).tableName).toBe('users');
    expect((s as any).jsonFileName).toBe('users');
  });

  test('run with no data file logs warning', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const warnSpy = jest.spyOn(console, 'log').mockImplementation();
    const s = new TestJSONSeeder();
    await s.run();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No data found'));
    warnSpy.mockRestore();
  });

  test('run with empty array logs warning', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('[]' as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const s = new TestJSONSeeder();
    await s.run();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No data found'));
    logSpy.mockRestore();
  });

  test('run skips when data already exists', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('[{"name":"A"}]' as any);

    // Override getTableCount to return > 0
    const { Manager } = require('../../../src/Capsule/Manager');
    Manager.getInstance.mockReturnValue({
      getConnection: () => ({
        table: () => ({
          count: jest.fn().mockResolvedValue(5),
          insert: jest.fn(),
        }),
      }),
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const s = new TestJSONSeeder();
    await s.run();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping'));
    logSpy.mockRestore();
  });

  test('run inserts data successfully', async () => {
    const mockInsert = jest.fn().mockResolvedValue(true);
    const { Manager } = require('../../../src/Capsule/Manager');
    Manager.getInstance.mockReturnValue({
      getConnection: () => ({
        table: () => ({
          count: jest.fn().mockResolvedValue(0),
          insert: mockInsert,
        }),
      }),
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('[{"name":"Alice"},{"name":"Bob"}]' as any);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const s = new TestJSONSeeder();
    await s.run();
    expect(mockInsert).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Seeded 2 records'));
    logSpy.mockRestore();
  });

  test('run with force ignores existing data', async () => {
    const mockInsert = jest.fn().mockResolvedValue(true);
    const { Manager } = require('../../../src/Capsule/Manager');
    Manager.getInstance.mockReturnValue({
      getConnection: () => ({
        table: () => ({
          count: jest.fn().mockResolvedValue(10),
          insert: mockInsert,
        }),
      }),
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('[{"name":"Force"}]' as any);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const s = new TestJSONSeeder();
    await s.run(true);
    expect(mockInsert).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  // ---- transform ----
  describe('transform', () => {
    test('converts camelCase to snake_case', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ firstName: 'John', lastName: 'Doe' });
      expect(result).toHaveProperty('first_name', 'John');
      expect(result).toHaveProperty('last_name', 'Doe');
    });

    test('skips MongoDB metadata fields', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ __v: 0, _id: 'abc', name: 'Test' });
      expect(result).not.toHaveProperty('__v');
      expect(result).not.toHaveProperty('_id');
      expect(result).toHaveProperty('name', 'Test');
    });

    test('accepts valid UUID ids', () => {
      const s = new TestJSONSeeder();
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = (s as any).transform({ id: uuid });
      expect(result.id).toBe(uuid);
    });

    test('skips non-UUID ids', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ id: 'not-a-uuid' });
      expect(result.id).toBeUndefined();
    });

    test('warns on MongoDB ObjectID values', () => {
      const s = new TestJSONSeeder();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (s as any).transform({ ref_id: '507f1f77bcf86cd799439011' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MongoDB ObjectID'));
      warnSpy.mockRestore();
    });

    test('handles null values', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ name: null });
      expect(result.name).toBeNull();
    });

    test('JSON-stringifies objects', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ meta: { key: 'val' } });
      expect(result.meta).toBe('{"key":"val"}');
    });

    test('JSON-stringifies arrays', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ tags: ['a', 'b'] });
      expect(result.tags).toBe('["a","b"]');
    });

    test('warns on arrays with ObjectIDs', () => {
      const s = new TestJSONSeeder();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (s as any).transform({ refs: ['507f1f77bcf86cd799439011'] });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MongoDB ObjectIDs'));
      warnSpy.mockRestore();
    });

    test('passes through primitives', () => {
      const s = new TestJSONSeeder();
      const result = (s as any).transform({ age: 25, active: true, name: 'Test' });
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
      expect(result.name).toBe('Test');
    });
  });
});
