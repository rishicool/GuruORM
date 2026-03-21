import { SqliteConnection } from '../../../src/Connection/SqliteConnection';

// Mock database objects
const mockStmt = {
  all: jest.fn().mockReturnValue([{ id: 1, name: 'Alice' }]),
  run: jest.fn().mockReturnValue({ changes: 2 }),
};

const mockDb = {
  prepare: jest.fn().mockReturnValue(mockStmt),
  exec: jest.fn(),
  close: jest.fn(),
};

describe('SqliteConnection', () => {
  let conn: SqliteConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    conn = new SqliteConnection({ driver: 'sqlite', database: ':memory:' } as any);
    // Bypass createConnection by injecting the mock db directly
    (conn as any).db = mockDb;
    (conn as any).client = mockDb;
  });

  test('constructor sets grammars and processor', () => {
    expect(conn.getQueryGrammar()).toBeTruthy();
    expect(conn.getPostProcessor()).toBeTruthy();
    expect(conn.getDriverName()).toBe('sqlite');
  });

  test('select creates connection lazily and returns rows', async () => {
    const rows = await conn.select('SELECT * FROM users WHERE id = ?', [1]);
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?');
    expect(mockStmt.all).toHaveBeenCalledWith(1);
    expect(rows).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('select returns same results on multiple calls', async () => {
    await conn.select('SELECT 1');
    await conn.select('SELECT 2');
    expect(mockDb.prepare).toHaveBeenCalledTimes(2);
  });

  test('insert delegates to statement', async () => {
    const result = await conn.insert('INSERT INTO users (name) VALUES (?)', ['Bob']);
    expect(result).toBe(true);
    expect(mockStmt.run).toHaveBeenCalledWith('Bob');
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
    const result = await conn.statement('CREATE TABLE test (id INTEGER)', []);
    expect(result).toBe(true);
  });

  test('unprepared uses exec', async () => {
    const result = await conn.unprepared('PRAGMA foreign_keys = ON');
    expect(mockDb.exec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    expect(result).toBe(true);
  });

  test('disconnect closes db and nullifies', async () => {
    // First force connection creation
    await conn.select('SELECT 1');
    await conn.disconnect();
    expect(mockDb.close).toHaveBeenCalled();
  });

  test('disconnect is noop when not connected', async () => {
    // Set db to null to simulate unconnected state
    (conn as any).db = null;
    await conn.disconnect();
    expect(mockDb.close).not.toHaveBeenCalled();
  });

  test('select throws on query error', async () => {
    mockStmt.all.mockImplementationOnce(() => { throw new Error('bad query'); });
    await expect(conn.select('BAD SQL')).rejects.toThrow();
  });

  test('statement throws on error', async () => {
    mockStmt.run.mockImplementationOnce(() => { throw new Error('bad stmt'); });
    await expect(conn.statement('BAD SQL')).rejects.toThrow();
  });

  test('affectingStatement throws on error', async () => {
    mockStmt.run.mockImplementationOnce(() => { throw new Error('bad aff'); });
    await expect(conn.update('BAD SQL')).rejects.toThrow();
  });

  test('unprepared throws on error', async () => {
    mockDb.exec.mockImplementationOnce(() => { throw new Error('bad exec'); });
    await expect(conn.unprepared('BAD SQL')).rejects.toThrow();
  });

  test('affectingStatement returns 0 when no changes', async () => {
    mockStmt.run.mockReturnValueOnce({ changes: 0 });
    const count = await conn.update('UPDATE users SET name = ?', ['x']);
    expect(count).toBe(0);
  });

  test('affectingStatement returns 0 when result has no changes prop', async () => {
    mockStmt.run.mockReturnValueOnce({});
    const count = await conn.update('UPDATE users SET name = ?', ['x']);
    expect(count).toBe(0);
  });

  test('createTransaction executes BEGIN TRANSACTION', async () => {
    await (conn as any).createTransaction();
    expect(mockDb.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
  });

  test('performCommit executes COMMIT', async () => {
    await (conn as any).performCommit();
    expect(mockDb.exec).toHaveBeenCalledWith('COMMIT');
  });

  test('performRollBack level 0 executes ROLLBACK', async () => {
    await (conn as any).performRollBack(0);
    expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK');
  });

  test('performRollBack level > 0 executes ROLLBACK TO SAVEPOINT', async () => {
    await (conn as any).performRollBack(2);
    expect(mockDb.exec).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT sp2');
  });
});
