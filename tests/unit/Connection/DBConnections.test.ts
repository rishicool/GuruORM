/**
 * Tests for database-specific Connection subclasses.
 * Each driver's external package is mocked.
 */

// ---- Mock mysql2/promise ----
const mockPool = {
  execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
  query: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
  end: jest.fn().mockResolvedValue(undefined),
};

jest.mock('mysql2/promise', () => ({
  __esModule: true,
  default: { createPool: jest.fn().mockReturnValue(mockPool) },
}));

// ---- Mock pg ----
// mockPgClient simulates the dedicated PoolClient checked out for transactions.
const mockPgClient = {
  query:   jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  release: jest.fn(),
};
const mockPgPool = {
  query:   jest.fn().mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 }),
  connect: jest.fn().mockResolvedValue(mockPgClient),
  end:     jest.fn().mockResolvedValue(undefined),
};

jest.mock('pg', () => ({
  __esModule: true,
  Pool: jest.fn().mockReturnValue(mockPgPool),
}));

import { MySqlConnection } from '../../../src/Connection/MySqlConnection';
import { PostgresConnection } from '../../../src/Connection/PostgresConnection';

const baseConfig = {
  driver: 'mysql' as any,
  host: 'localhost',
  port: 3306,
  database: 'test_db',
  username: 'root',
  password: '',
};

// ======== MySQL Connection ========
describe('Connection / MySqlConnection', () => {
  let conn: MySqlConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    conn = new MySqlConnection(baseConfig);
  });

  test('getDriverName returns mysql', () => {
    expect(conn.getDriverName()).toBe('mysql');
  });

  test('select executes pool.execute and returns rows', async () => {
    mockPool.execute.mockResolvedValue([[{ id: 1, name: 'A' }], []]);
    const result = await conn.select('SELECT * FROM users');
    expect(mockPool.execute).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, name: 'A' }]);
  });

  test('select with bindings', async () => {
    mockPool.execute.mockResolvedValue([[{ id: 1 }], []]);
    await conn.select('SELECT * FROM users WHERE id = ?', [1]);
    expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
  });

  test('insert delegates to statement', async () => {
    mockPool.execute.mockResolvedValue([{ affectedRows: 1 }, []]);
    const result = await conn.insert('INSERT INTO users (name) VALUES (?)', ['Alice']);
    expect(result).toBe(true);
  });

  test('insertGetId returns insertId', async () => {
    mockPool.execute.mockResolvedValue([{ insertId: 42 }, []]);
    const id = await conn.insertGetId('INSERT INTO users (name) VALUES (?)', ['Alice']);
    expect(id).toBe(42);
  });

  test('update returns affected rows', async () => {
    mockPool.execute.mockResolvedValue([{ affectedRows: 3 }, []]);
    const result = await conn.update('UPDATE users SET name = ?', ['Bob']);
    expect(result).toBe(3);
  });

  test('delete returns affected rows', async () => {
    mockPool.execute.mockResolvedValue([{ affectedRows: 1 }, []]);
    const result = await conn.delete('DELETE FROM users WHERE id = ?', [1]);
    expect(result).toBe(1);
  });

  test('statement returns true', async () => {
    mockPool.execute.mockResolvedValue([{}, []]);
    const result = await conn.statement('CREATE TABLE test (id INT)');
    expect(result).toBe(true);
  });

  test('unprepared runs pool.query', async () => {
    mockPool.query.mockResolvedValue([[{}], []]);
    await conn.unprepared('SET @foo = 1');
    expect(mockPool.query).toHaveBeenCalledWith('SET @foo = 1');
  });

  test('disconnect calls pool.end', async () => {
    await conn.disconnect();
    expect(mockPool.end).toHaveBeenCalled();
  });

  test('has proper grammars set', () => {
    expect(conn.getQueryGrammar()).toBeDefined();
    expect(conn.getSchemaGrammar()).toBeDefined();
  });

  test('has post processor set', () => {
    expect(conn.getPostProcessor()).toBeDefined();
  });

  test('insertGetId returns insert ID', async () => {
    mockPool.execute.mockResolvedValueOnce([{ insertId: 42 }, []]);
    const id = await conn.insertGetId('INSERT INTO users (name) VALUES (?)', ['Bob']);
    expect(id).toBe(42);
  });

  test('select throws on query error', async () => {
    mockPool.execute.mockRejectedValueOnce(new Error('mysql error'));
    await expect(conn.select('BAD SQL')).rejects.toThrow();
  });

  test('statement throws on error', async () => {
    mockPool.execute.mockRejectedValueOnce(new Error('stmt error'));
    await expect(conn.statement('BAD SQL')).rejects.toThrow();
  });

  test('affectingStatement throws on error', async () => {
    mockPool.execute.mockRejectedValueOnce(new Error('aff error'));
    await expect(conn.update('BAD SQL')).rejects.toThrow();
  });

  test('insertGetId throws on error', async () => {
    mockPool.execute.mockRejectedValueOnce(new Error('insert error'));
    await expect(conn.insertGetId('BAD SQL', [])).rejects.toThrow();
  });

  test('unprepared throws on error', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('unprepared error'));
    await expect(conn.unprepared('BAD SQL')).rejects.toThrow();
  });

  test('createTransaction runs START TRANSACTION', async () => {
    await (conn as any).createTransaction();
    expect(mockPool.query).toHaveBeenCalledWith('START TRANSACTION');
  });

  test('performCommit runs COMMIT', async () => {
    await (conn as any).performCommit();
    expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
  });

  test('performRollBack level 0 runs ROLLBACK', async () => {
    await (conn as any).performRollBack(0);
    expect(mockPool.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('performRollBack level > 0 runs ROLLBACK TO SAVEPOINT', async () => {
    await (conn as any).performRollBack(2);
    expect(mockPool.query).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT sp2');
  });
});

// ======== PostgreSQL Connection ========
describe('Connection / PostgresConnection', () => {
  let conn: PostgresConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-wire mockPgPool.connect so each test gets a fresh mockPgClient
    mockPgPool.connect.mockResolvedValue(mockPgClient);
    conn = new PostgresConnection({
      ...baseConfig,
      driver: 'pgsql' as any,
      port: 5432,
    });
  });

  test('getDriverName returns pgsql', () => {
    expect(conn.getDriverName()).toBe('pgsql');
  });

  test('select converts bindings and returns rows', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await conn.select('SELECT * FROM users WHERE id = ?', [1]);
    expect(result).toEqual([{ id: 1 }]);
    // Should convert ? to $1
    const call = mockPgPool.query.mock.calls[0];
    expect(call[0]).toContain('$1');
  });

  test('insert delegates to statement', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const result = await conn.insert('INSERT INTO users (name) VALUES (?)', ['Alice']);
    expect(result).toBe(true);
  });

  test('update returns rowCount', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 2 });
    const result = await conn.update('UPDATE users SET name = ?', ['Bob']);
    expect(result).toBe(2);
  });

  test('delete returns rowCount', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 1 });
    const result = await conn.delete('DELETE FROM users WHERE id = ?', [1]);
    expect(result).toBe(1);
  });

  test('statement returns true', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const result = await conn.statement('CREATE TABLE test (id INT)');
    expect(result).toBe(true);
  });

  test('unprepared runs raw query', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    await conn.unprepared('SET search_path TO public');
    expect(mockPgPool.query).toHaveBeenCalledWith('SET search_path TO public');
  });

  test('disconnect calls pool.end', async () => {
    await conn.disconnect();
    expect(mockPgPool.end).toHaveBeenCalled();
  });

  test('getSchemaName returns public by default', () => {
    expect(conn.getSchemaName()).toBe('public');
  });

  test('getSchemaName returns config schema when set', () => {
    const c = new PostgresConnection({
      ...baseConfig,
      driver: 'pgsql' as any,
      schema: 'custom',
    } as any);
    expect(c.getSchemaName()).toBe('custom');
  });

  test('has proper grammars set', () => {
    expect(conn.getQueryGrammar()).toBeDefined();
    expect(conn.getSchemaGrammar()).toBeDefined();
  });

  test('convertBindings handles multiple placeholders', async () => {
    mockPgPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    await conn.select('SELECT * FROM t WHERE a = ? AND b = ?', [1, 2]);
    const call = mockPgPool.query.mock.calls[0];
    expect(call[0]).toContain('$1');
    expect(call[0]).toContain('$2');
    expect(call[0]).not.toContain('?');
  });

  test('select throws on query error', async () => {
    mockPgPool.query.mockRejectedValueOnce(new Error('pg select error'));
    await expect(conn.select('BAD SQL')).rejects.toThrow();
  });

  test('statement throws on error', async () => {
    mockPgPool.query.mockRejectedValueOnce(new Error('pg stmt error'));
    await expect(conn.statement('BAD SQL')).rejects.toThrow();
  });

  test('affectingStatement throws on error', async () => {
    mockPgPool.query.mockRejectedValueOnce(new Error('pg aff error'));
    await expect(conn.update('BAD SQL')).rejects.toThrow();
  });

  test('unprepared throws on error', async () => {
    mockPgPool.query.mockRejectedValueOnce(new Error('pg raw error'));
    await expect(conn.unprepared('BAD SQL')).rejects.toThrow();
  });

  test('createTransaction with no existing transactions runs BEGIN', async () => {
    (conn as any).transactions = 0;
    mockPgClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await (conn as any).createTransaction();
    expect(mockPgPool.connect).toHaveBeenCalled();
    expect(mockPgClient.query).toHaveBeenCalledWith('BEGIN');
  });

  test('createTransaction with existing transactions creates savepoint', async () => {
    // Simulate an already-checked-out client (transactions > 0)
    (conn as any).transactions = 1;
    (conn as any)._txClient = mockPgClient;
    mockPgClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await (conn as any).createTransaction();
    expect(mockPgClient.query).toHaveBeenCalledWith('SAVEPOINT sp2');
  });

  test('performCommit runs COMMIT', async () => {
    (conn as any)._txClient = mockPgClient;
    mockPgClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await (conn as any).performCommit();
    expect(mockPgClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockPgClient.release).toHaveBeenCalled();
    expect((conn as any)._txClient).toBeNull();
  });

  test('performRollBack level 0 runs ROLLBACK', async () => {
    (conn as any)._txClient = mockPgClient;
    mockPgClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await (conn as any).performRollBack(0);
    expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockPgClient.release).toHaveBeenCalled();
    expect((conn as any)._txClient).toBeNull();
  });

  test('performRollBack level > 0 runs ROLLBACK TO SAVEPOINT', async () => {
    (conn as any)._txClient = mockPgClient;
    mockPgClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await (conn as any).performRollBack(2);
    expect(mockPgClient.query).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT sp3');
  });
});
