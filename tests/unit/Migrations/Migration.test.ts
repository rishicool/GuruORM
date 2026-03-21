import { Manager } from '../../../src/Capsule/Manager';

// Mock Manager.getInstance
jest.mock('../../../src/Capsule/Manager', () => {
  const mockSchema = {
    create: jest.fn().mockResolvedValue(undefined),
    table: jest.fn().mockResolvedValue(undefined),
    drop: jest.fn().mockResolvedValue(undefined),
    dropIfExists: jest.fn().mockResolvedValue(undefined),
  };
  return {
    Manager: {
      getInstance: jest.fn().mockReturnValue({
        schema: jest.fn().mockReturnValue(mockSchema),
      }),
    },
  };
});

// We need to import Migration AFTER mocking Manager
import { Migration } from '../../../src/Migrations/Migration';

class TestMigration extends Migration {
  async up(): Promise<void> {
    await (this as any).schema.create('test_table', (table: any) => {
      table.id();
    });
  }

  async down(): Promise<void> {
    await (this as any).schema.dropIfExists('test_table');
  }
}

class SkipMigration extends Migration {
  async up(): Promise<void> {}
  async down(): Promise<void> {}

  shouldRun(): boolean {
    return false;
  }
}

class ConnectionMigration extends Migration {
  protected connection = 'mysql';

  async up(): Promise<void> {}
  async down(): Promise<void> {}
}

describe('Migration base class', () => {
  test('constructor gets schema from Manager instance', () => {
    const m = new TestMigration();
    expect((m as any).schema).toBeTruthy();
  });

  test('up calls schema.create', async () => {
    const m = new TestMigration();
    await m.up();
    expect((m as any).schema.create).toHaveBeenCalledWith('test_table', expect.any(Function));
  });

  test('down calls schema.dropIfExists', async () => {
    const m = new TestMigration();
    await m.down();
    expect((m as any).schema.dropIfExists).toHaveBeenCalledWith('test_table');
  });

  test('getConnection returns undefined by default', () => {
    const m = new TestMigration();
    expect(m.getConnection()).toBeUndefined();
  });

  test('getConnection returns connection name when set', () => {
    const m = new ConnectionMigration();
    expect(m.getConnection()).toBe('mysql');
  });

  test('shouldRun returns true by default', () => {
    const m = new TestMigration();
    expect(m.shouldRun()).toBe(true);
  });

  test('shouldRun can be overridden to false', () => {
    const m = new SkipMigration();
    expect(m.shouldRun()).toBe(false);
  });

  test('withinTransaction defaults to true', () => {
    const m = new TestMigration();
    expect(m.withinTransaction).toBe(true);
  });
});
