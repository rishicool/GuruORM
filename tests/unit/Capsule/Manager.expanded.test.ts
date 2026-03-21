import { Manager } from '../../../src/Capsule/Manager';
import { ConnectionManager } from '../../../src/Connection/ConnectionManager';

/**
 * Expanded Manager tests — covers instance & static delegation methods
 * that need a mock connection to verify proper delegation.
 */
describe('Capsule / Manager — expanded coverage', () => {
  let manager: Manager;
  let mockConnection: any;

  beforeEach(() => {
    (Manager as any).instance = null;

    mockConnection = {
      table: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis() }),
      select: jest.fn().mockResolvedValue([{ id: 1 }]),
      insert: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(1),
      statement: jest.fn().mockResolvedValue(true),
      transaction: jest.fn().mockImplementation(async (cb: Function) => cb()),
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      raw: jest.fn().mockReturnValue({ value: 'raw' }),
      getSchemaBuilder: jest.fn().mockReturnValue({ create: jest.fn() }),
    };

    manager = new Manager();
    // Inject mock connection
    jest.spyOn(manager, 'getConnection').mockReturnValue(mockConnection as any);
    jest.spyOn(manager, 'bootEloquent').mockImplementation(() => {});
  });

  afterEach(() => {
    (Manager as any).instance = null;
    jest.restoreAllMocks();
  });

  // ---- Instance delegation methods ----
  describe('instance: table', () => {
    test('delegates to connection.table', () => {
      manager.table('users', 'u');
      expect(mockConnection.table).toHaveBeenCalledWith('users', 'u');
    });
  });

  describe('instance: schema', () => {
    test('delegates to connection.getSchemaBuilder', () => {
      manager.schema();
      expect(mockConnection.getSchemaBuilder).toHaveBeenCalled();
    });
  });

  describe('instance: select', () => {
    test('delegates to connection.select', async () => {
      const result = await manager.select('SELECT * FROM t', ['a']);
      expect(mockConnection.select).toHaveBeenCalledWith('SELECT * FROM t', ['a']);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('instance: insert', () => {
    test('delegates to connection.insert', async () => {
      await manager.insert('INSERT INTO t VALUES (?)', [1]);
      expect(mockConnection.insert).toHaveBeenCalledWith('INSERT INTO t VALUES (?)', [1]);
    });
  });

  describe('instance: update', () => {
    test('delegates to connection.update', async () => {
      const result = await manager.update('UPDATE t SET x=?', [1]);
      expect(result).toBe(1);
    });
  });

  describe('instance: delete', () => {
    test('delegates to connection.delete', async () => {
      const result = await manager.delete('DELETE FROM t WHERE id=?', [1]);
      expect(result).toBe(1);
    });
  });

  describe('instance: statement', () => {
    test('delegates to connection.statement', async () => {
      const result = await manager.statement('CREATE TABLE t (id INT)', []);
      expect(result).toBe(true);
    });
  });

  describe('instance: transaction', () => {
    test('wraps callback in connection transaction', async () => {
      await manager.transaction(async (conn) => 'ok');
      expect(mockConnection.transaction).toHaveBeenCalled();
    });
  });

  describe('instance: beginTransaction / commit / rollback', () => {
    test('beginTransaction delegates', async () => {
      await manager.beginTransaction();
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
    });

    test('commit delegates', async () => {
      await manager.commit();
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('rollback delegates', async () => {
      await manager.rollback();
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('instance: disconnect', () => {
    test('disconnects specific connection', async () => {
      manager.addConnection({ driver: 'sqlite' as any, database: ':memory:' }, 'main');
      await manager.disconnect('main');
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });

    test('disconnects all connections', async () => {
      manager.addConnection({ driver: 'sqlite' as any, database: ':memory:' }, 'default');
      await manager.disconnect();
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });
  });

  describe('instance: raw', () => {
    test('delegates to connection.raw', () => {
      manager.raw('NOW()');
      expect(mockConnection.raw).toHaveBeenCalledWith('NOW()');
    });
  });

  // ---- Static delegation ----
  describe('static methods', () => {
    beforeEach(() => {
      manager.setAsGlobal();
    });

    test('Manager.table delegates', () => {
      Manager.table('users');
      expect(mockConnection.table).toHaveBeenCalledWith('users', undefined);
    });

    test('Manager.schema delegates', () => {
      Manager.schema();
      expect(mockConnection.getSchemaBuilder).toHaveBeenCalled();
    });

    test('Manager.select delegates', async () => {
      await Manager.select('SELECT 1');
      expect(mockConnection.select).toHaveBeenCalled();
    });

    test('Manager.insert delegates', async () => {
      await Manager.insert('INSERT INTO t VALUES (?)', [1]);
      expect(mockConnection.insert).toHaveBeenCalled();
    });

    test('Manager.update delegates', async () => {
      await Manager.update('UPDATE t SET x=?', [1]);
      expect(mockConnection.update).toHaveBeenCalled();
    });

    test('Manager.delete delegates', async () => {
      await Manager.delete('DELETE FROM t', []);
      expect(mockConnection.delete).toHaveBeenCalled();
    });

    test('Manager.statement delegates', async () => {
      await Manager.statement('CREATE TABLE t (id INT)');
      expect(mockConnection.statement).toHaveBeenCalled();
    });

    test('Manager.transaction delegates', async () => {
      await Manager.transaction(async () => 'ok');
      expect(mockConnection.transaction).toHaveBeenCalled();
    });

    test('Manager.disconnect delegates', async () => {
      manager.addConnection({ driver: 'sqlite' as any, database: ':memory:' }, 'default');
      await Manager.disconnect();
    });

    test('Manager.raw delegates', () => {
      Manager.raw('NOW()');
      expect(mockConnection.raw).toHaveBeenCalled();
    });
  });
});
