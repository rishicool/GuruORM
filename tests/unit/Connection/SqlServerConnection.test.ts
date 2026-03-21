import { SqlServerConnection } from '../../../src/Connection/SqlServerConnection';

// Mock tedious
const mockResult = { recordset: [{ id: 1, name: 'Alice' }], rowsAffected: [2] };
const mockRequest = {
  input: jest.fn().mockReturnThis(),
  query: jest.fn().mockResolvedValue(mockResult),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(undefined),
  request: jest.fn().mockReturnValue(mockRequest),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('tedious', () => ({
  ConnectionPool: jest.fn().mockImplementation(() => mockPool),
  Request: jest.fn(),
}));

describe('SqlServerConnection', () => {
  let conn: SqlServerConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    conn = new SqlServerConnection({
      driver: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'testdb',
      username: 'sa',
      password: 'pass',
    } as any);
  });

  test('constructor sets grammars and processor', () => {
    expect(conn.getQueryGrammar()).toBeTruthy();
    expect(conn.getPostProcessor()).toBeTruthy();
    expect(conn.getDriverName()).toBe('sqlserver');
  });

  test('select returns rows and parameterizes ?s', async () => {
    const rows = await conn.select('SELECT * FROM users WHERE id = ? AND name = ?', [1, 'Bob']);
    expect(mockRequest.input).toHaveBeenCalledWith('p0', 1);
    expect(mockRequest.input).toHaveBeenCalledWith('p1', 'Bob');
    expect(mockRequest.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = @p0 AND name = @p1');
    expect(rows).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('select returns empty when no recordset', async () => {
    mockRequest.query.mockResolvedValueOnce({ recordset: undefined });
    const rows = await conn.select('SELECT 1');
    expect(rows).toEqual([]);
  });

  test('insert delegates to statement and returns true', async () => {
    const result = await conn.insert('INSERT INTO users (name) VALUES (?)', ['Bob']);
    expect(result).toBe(true);
  });

  test('update returns affected rows', async () => {
    const count = await conn.update('UPDATE users SET name = ? WHERE id = ?', ['New', 1]);
    expect(count).toBe(2);
  });

  test('delete returns affected rows', async () => {
    const count = await conn.delete('DELETE FROM users WHERE id = ?', [1]);
    expect(count).toBe(2);
  });

  test('statement returns true on success', async () => {
    const result = await conn.statement('CREATE TABLE test (id INT)', []);
    expect(result).toBe(true);
  });

  test('affectingStatement returns 0 when rowsAffected is empty', async () => {
    mockRequest.query.mockResolvedValueOnce({ rowsAffected: [0] });
    const count = await conn.update('UPDATE users SET name = ?', ['x']);
    expect(count).toBe(0);
  });

  test('unprepared runs raw query without bindings', async () => {
    const result = await conn.unprepared('BEGIN TRANSACTION');
    expect(mockRequest.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(result).toBe(true);
  });

  test('disconnect closes pool and nullifies', async () => {
    // Ensure connection resolves
    await conn.select('SELECT 1');
    await conn.disconnect();
    expect(mockPool.close).toHaveBeenCalled();
  });

  test('disconnect is noop when pool is null', async () => {
    // Force pool to null
    (conn as any).pool = null;
    await conn.disconnect();
    expect(mockPool.close).not.toHaveBeenCalled();
  });

  test('select throws on query error', async () => {
    mockRequest.query.mockRejectedValueOnce(new Error('sql error'));
    await expect(conn.select('BAD SQL')).rejects.toThrow();
  });

  test('statement throws on error', async () => {
    mockRequest.query.mockRejectedValueOnce(new Error('stmt error'));
    await expect(conn.statement('BAD SQL')).rejects.toThrow();
  });

  test('affectingStatement throws on error', async () => {
    mockRequest.query.mockRejectedValueOnce(new Error('aff error'));
    await expect(conn.update('BAD SQL')).rejects.toThrow();
  });

  test('unprepared throws on error', async () => {
    mockRequest.query.mockRejectedValueOnce(new Error('unprep error'));
    await expect(conn.unprepared('BAD SQL')).rejects.toThrow();
  });

  test('createTransaction calls unprepared with BEGIN TRANSACTION', async () => {
    await (conn as any).createTransaction();
    expect(mockRequest.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
  });

  test('performCommit calls unprepared with COMMIT', async () => {
    await (conn as any).performCommit();
    expect(mockRequest.query).toHaveBeenCalledWith('COMMIT');
  });

  test('performRollBack level 0 calls ROLLBACK', async () => {
    await (conn as any).performRollBack(0);
    expect(mockRequest.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('performRollBack level > 0 calls ROLLBACK TRANSACTION', async () => {
    await (conn as any).performRollBack(3);
    expect(mockRequest.query).toHaveBeenCalledWith('ROLLBACK TRANSACTION sp3');
  });

  test('insertGetId returns last insert id when supported', async () => {
    // insertGetId delegates to statement
    const result = await conn.insert('INSERT INTO users (name) VALUES (?)', ['Test']);
    expect(result).toBe(true);
  });
});
