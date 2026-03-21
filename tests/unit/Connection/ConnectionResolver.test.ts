import { ConnectionResolver } from '../../../src/Connection/ConnectionResolver';

describe('Connection / ConnectionResolver', () => {
  let resolver: ConnectionResolver;
  const mockConn: any = { disconnect: jest.fn() };

  beforeEach(() => {
    resolver = new ConnectionResolver();
  });

  describe('addConnection / connection', () => {
    test('adds and retrieves a connection', () => {
      resolver.addConnection('mysql', mockConn);
      expect(resolver.connection('mysql')).toBe(mockConn);
    });

    test('throws for non-existent connection', () => {
      expect(() => resolver.connection('missing')).toThrow('not configured');
    });

    test('uses default connection when name is null', () => {
      resolver.addConnection('default', mockConn);
      expect(resolver.connection(null)).toBe(mockConn);
    });

    test('uses default connection when name omitted', () => {
      resolver.addConnection('default', mockConn);
      expect(resolver.connection()).toBe(mockConn);
    });
  });

  describe('hasConnection', () => {
    test('returns true for existing connection', () => {
      resolver.addConnection('test', mockConn);
      expect(resolver.hasConnection('test')).toBe(true);
    });

    test('returns false for missing connection', () => {
      expect(resolver.hasConnection('none')).toBe(false);
    });
  });

  describe('default connection', () => {
    test('default is "default"', () => {
      expect(resolver.getDefaultConnection()).toBe('default');
    });

    test('setDefaultConnection changes default', () => {
      resolver.setDefaultConnection('mysql');
      expect(resolver.getDefaultConnection()).toBe('mysql');
    });

    test('connection uses updated default', () => {
      resolver.addConnection('mysql', mockConn);
      resolver.setDefaultConnection('mysql');
      expect(resolver.connection()).toBe(mockConn);
    });
  });

  describe('getConnections', () => {
    test('returns all connections', () => {
      resolver.addConnection('a', mockConn);
      resolver.addConnection('b', { ...mockConn });
      expect(resolver.getConnections().size).toBe(2);
    });
  });
});
