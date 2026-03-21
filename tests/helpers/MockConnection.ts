/**
 * Test Helper — MockConnection
 *
 * Creates a mock MySQL-like Connection object for unit testing
 * the Query Builder, Grammar, and related components
 * without requiring a real database.
 *
 * Usage:
 *   const conn = createMockConnection();
 *   const builder = createBuilder('users', conn);
 */

import { Grammar as MySqlGrammar } from '../../src/Query/Grammars/MySqlGrammar';
import { Grammar as BaseGrammar } from '../../src/Query/Grammars/Grammar';
import { Processor } from '../../src/Query/Processors/Processor';
import { Builder } from '../../src/Query/Builder';
import { ConnectionConfig } from '../../src/Connection/ConnectionInterface';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockConnection {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  statement: jest.Mock;
  affectingStatement: jest.Mock;
  unprepared: jest.Mock;
  raw: jest.Mock;
  getQueryGrammar: () => MySqlGrammar;
  getPostProcessor: () => Processor;
  getDriverName: () => string;
  getConfig: (key?: string) => any;
  table: jest.Mock;
  selectOne: jest.Mock;
  scalar: jest.Mock;
  insertGetId: jest.Mock;
  getTablePrefix: () => string;
  getName: () => string;
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Build a MockConnection with sensible defaults.
 * Every DB method is a jest.fn() so callers can spy / override easily.
 */
export function createMockConnection(
  overrides: Partial<MockConnection> = {},
  config: Partial<ConnectionConfig> = {},
): MockConnection {
  const grammar = new MySqlGrammar();
  const processor = new Processor();

  const fullConfig: ConnectionConfig = {
    driver: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'test_db',
    username: 'root',
    password: '',
    ...config,
  };

  // Wire the wrapIdentifier hook if provided
  if (fullConfig.wrapIdentifier) {
    grammar.setWrapIdentifier(fullConfig.wrapIdentifier);
  }

  return {
    select: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue(0),
    statement: jest.fn().mockResolvedValue(true),
    affectingStatement: jest.fn().mockResolvedValue(0),
    unprepared: jest.fn().mockResolvedValue(true),
    raw: jest.fn((val) => ({
      getValue: () => val,
      toString: () => String(val),
    })),
    getQueryGrammar: () => grammar,
    getPostProcessor: () => processor,
    getDriverName: () => 'mysql',
    getConfig: (key?: string) =>
      key ? (fullConfig as any)[key] : fullConfig,
    table: jest.fn(),
    selectOne: jest.fn().mockResolvedValue(null),
    scalar: jest.fn().mockResolvedValue(null),
    insertGetId: jest.fn().mockResolvedValue(1),
    getTablePrefix: () => fullConfig.prefix || '',
    getName: () => 'default',
    ...overrides,
  };
}

/**
 * Convenience: create a QueryBuilder already pointed at `table`.
 * Returns builder + the underlying mock connection for assertions.
 */
export function createBuilder(
  table: string,
  connectionOrOverrides?: MockConnection | Partial<MockConnection>,
  config?: Partial<ConnectionConfig>,
) {
  const connection =
    connectionOrOverrides && 'getQueryGrammar' in connectionOrOverrides
      ? (connectionOrOverrides as MockConnection)
      : createMockConnection(
          connectionOrOverrides as Partial<MockConnection>,
          config,
        );

  const grammar = connection.getQueryGrammar();
  const processor = connection.getPostProcessor();
  const builder = new Builder(connection as any, grammar, processor);
  builder.from(table);

  return { builder, connection, grammar };
}
