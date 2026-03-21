import { ConnectionManager } from '../../../src/Connection/ConnectionManager';

// Mock the connection classes that try to connect in constructors
jest.mock('../../../src/Connection/SqlServerConnection', () => ({
  SqlServerConnection: jest.fn().mockImplementation(function(this: any, config: any) {
    this.config = config;
    this.setName = jest.fn();
    this.disconnect = jest.fn().mockResolvedValue(undefined);
  }),
}));
jest.mock('../../../src/Connection/PostgresConnection', () => ({
  PostgresConnection: jest.fn().mockImplementation(function(this: any, config: any) {
    this.config = config;
    this.setName = jest.fn();
    this.disconnect = jest.fn().mockResolvedValue(undefined);
  }),
}));
jest.mock('../../../src/Connection/SqliteConnection', () => ({
  SqliteConnection: jest.fn().mockImplementation(function(this: any, config: any) {
    this.config = config;
    this.setName = jest.fn();
    this.disconnect = jest.fn().mockResolvedValue(undefined);
  }),
}));
jest.mock('../../../src/Connection/MySqlConnection', () => ({
  MySqlConnection: jest.fn().mockImplementation(function(this: any, config: any) {
    this.config = config;
    this.setName = jest.fn();
    this.disconnect = jest.fn().mockResolvedValue(undefined);
  }),
}));

describe('Connection / ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  describe('addConnection / connection', () => {
    test('adds and retrieves a mysql connection', () => {
      manager.addConnection('db', { driver: 'mysql', host: 'localhost', database: 'test' } as any);
      const conn = manager.connection('db');
      expect(conn).toBeDefined();
    });

    test('adds postgres connection', () => {
      manager.addConnection('pg', { driver: 'postgres', host: 'localhost', database: 'test' } as any);
      expect(manager.connection('pg')).toBeDefined();
    });

    test('adds pgsql alias', () => {
      manager.addConnection('pg', { driver: 'pgsql', host: 'localhost', database: 'test' } as any);
      expect(manager.connection('pg')).toBeDefined();
    });

    test('adds sqlite connection', () => {
      manager.addConnection('lite', { driver: 'sqlite', database: ':memory:' } as any);
      expect(manager.connection('lite')).toBeDefined();
    });

    test('adds sqlserver connection', () => {
      manager.addConnection('ms', { driver: 'sqlserver', host: 'localhost', database: 'test' } as any);
      expect(manager.connection('ms')).toBeDefined();
    });

    test('throws for unsupported driver', () => {
      expect(() => {
        manager.addConnection('x', { driver: 'oracle' } as any);
      }).toThrow('Unsupported driver');
    });

    test('throws for non-existent connection', () => {
      expect(() => manager.connection('missing')).toThrow('not configured');
    });
  });

  describe('default connection', () => {
    test('default is "default"', () => {
      expect(manager.getDefaultConnection()).toBe('default');
    });

    test('setDefaultConnection updates default', () => {
      manager.setDefaultConnection('mysql');
      expect(manager.getDefaultConnection()).toBe('mysql');
    });

    test('uses default when no name given', () => {
      manager.addConnection('default', { driver: 'mysql', host: 'localhost', database: 'test' } as any);
      expect(manager.connection()).toBeDefined();
    });
  });

  describe('getResolver', () => {
    test('returns a ConnectionResolver', () => {
      expect(manager.getResolver()).toBeDefined();
    });

    test('resolver has connections added to manager', () => {
      manager.addConnection('db', { driver: 'mysql', host: 'localhost', database: 'test' } as any);
      expect(manager.getResolver().hasConnection('db')).toBe(true);
    });
  });

  describe('table', () => {
    test('static table throws without configured connection', () => {
      expect(() => ConnectionManager.table('users')).toThrow('requires a configured connection');
    });
  });

  describe('disconnectAll', () => {
    test('disconnects all connections', async () => {
      manager.addConnection('db', { driver: 'mysql', host: 'localhost', database: 'test' } as any);
      // The mysql connection won't actually connect, but disconnect should handle it
      await manager.disconnectAll();
      expect(() => manager.connection('db')).toThrow('not configured');
    });
  });
});
