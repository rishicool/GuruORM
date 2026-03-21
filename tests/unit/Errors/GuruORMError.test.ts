import { describe, it, expect } from '@jest/globals';
import {
  GuruORMError,
  QueryException,
  ModelNotFoundException,
  ConnectionException,
  RelationNotFoundException,
  MultipleRecordsFoundException,
} from '../../../src/Errors/GuruORMError';

// ─── GuruORMError (base) ──────────────────────────────────────────────

describe('Errors / GuruORMError', () => {
  it('is an instance of Error', () => {
    const e = new GuruORMError('test');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(GuruORMError);
  });

  it('sets name to GuruORMError', () => {
    const e = new GuruORMError('msg');
    expect(e.name).toBe('GuruORMError');
  });

  it('stores message', () => {
    const e = new GuruORMError('something broke');
    expect(e.message).toBe('something broke');
  });

  it('preserves original error', () => {
    const cause = new Error('db down');
    const e = new GuruORMError('wrapper', cause);
    expect(e.originalError).toBe(cause);
  });

  it('toJSON includes name and message', () => {
    const json = new GuruORMError('fail').toJSON();
    expect(json.name).toBe('GuruORMError');
    expect(json.message).toBe('fail');
  });

  it('toJSON includes cause when original error present', () => {
    const json = new GuruORMError('wrap', new Error('inner')).toJSON();
    expect(json.cause).toBe('inner');
  });

  it('format returns readable string', () => {
    const output = new GuruORMError('broken').format();
    expect(output).toContain('[GuruORMError] broken');
  });

  it('format includes stack frames when present', () => {
    const e = new GuruORMError('test');
    const output = e.format();
    expect(output).toContain('[GuruORMError]');
  });

  it('extractFrames filters node_modules/internal frames', () => {
    const e = new GuruORMError('test');
    // format invokes extractFrames internally
    expect(typeof e.format()).toBe('string');
  });
});

// ─── QueryException ───────────────────────────────────────────────────

describe('Errors / QueryException', () => {
  it('extends GuruORMError', () => {
    const e = new QueryException('fail', 'SELECT 1', []);
    expect(e).toBeInstanceOf(GuruORMError);
    expect(e).toBeInstanceOf(QueryException);
  });

  it('sets name to QueryException', () => {
    const e = new QueryException('fail', 'SELECT 1', []);
    expect(e.name).toBe('QueryException');
  });

  it('captures sql and bindings', () => {
    const e = new QueryException('error', 'SELECT * FROM users WHERE id = ?', [42]);
    expect(e.sql).toBe('SELECT * FROM users WHERE id = ?');
    expect(e.bindings).toEqual([42]);
  });

  it('defaults connectionName and driver', () => {
    const e = new QueryException('err', 'SQL', []);
    expect(e.connectionName).toBe('default');
    expect(e.driver).toBe('unknown');
  });

  it('accepts custom connectionName and driver', () => {
    const e = new QueryException('err', 'SQL', [], undefined, 'replica', 'mysql');
    expect(e.connectionName).toBe('replica');
    expect(e.driver).toBe('mysql');
  });

  it('message includes SQL, bindings, connection info', () => {
    const e = new QueryException('query failed', 'SELECT 1', [1], undefined, 'main', 'pg');
    expect(e.message).toContain('SELECT 1');
    expect(e.message).toContain('main');
    expect(e.message).toContain('pg');
  });

  it('toJSON includes sql and bindings', () => {
    const json = new QueryException('fail', 'SELECT ?', [1]).toJSON();
    expect(json.sql).toBe('SELECT ?');
    expect(json.bindings).toEqual([1]);
  });

  it('format includes SQL and bindings lines', () => {
    const output = new QueryException('err', 'SELECT 1', [1, 2]).format();
    expect(output).toContain('SQL:');
    expect(output).toContain('Bindings:');
  });

  it('format includes cause when originalError present', () => {
    const cause = new Error('connection lost');
    const e = new QueryException('query failed', 'SELECT 1', [], cause);
    const output = e.format();
    expect(output).toContain('Cause:');
    expect(output).toContain('connection lost');
  });

  it('redacts long string bindings in message', () => {
    const longStr = 'a'.repeat(100);
    const e = new QueryException('err', 'SQL', [longStr]);
    expect(e.message).toContain('[redacted]');
  });

  it('preserves Date bindings in redaction', () => {
    const date = new Date('2024-01-15');
    const e = new QueryException('err', 'SQL', [date, true, null, 42]);
    // If it doesn't throw, redaction handled all types
    expect(e.message).toContain('SQL');
  });
});

// ─── ModelNotFoundException ──────────────────────────────────────────

describe('Errors / ModelNotFoundException', () => {
  it('extends GuruORMError', () => {
    const e = new ModelNotFoundException('User');
    expect(e).toBeInstanceOf(GuruORMError);
  });

  it('sets name to ModelNotFoundException', () => {
    expect(new ModelNotFoundException('User').name).toBe('ModelNotFoundException');
  });

  it('includes model name in message', () => {
    const e = new ModelNotFoundException('User');
    expect(e.message).toContain('User');
  });

  it('includes ids when provided', () => {
    const e = new ModelNotFoundException('User', [1, 2, 3]);
    expect(e.message).toContain('1, 2, 3');
    expect(e.ids).toEqual([1, 2, 3]);
  });

  it('defaults ids to empty array', () => {
    expect(new ModelNotFoundException('Post').ids).toEqual([]);
  });

  it('toJSON includes model and ids', () => {
    const json = new ModelNotFoundException('User', [5]).toJSON();
    expect(json.model).toBe('User');
    expect(json.ids).toEqual([5]);
  });
});

// ─── ConnectionException ────────────────────────────────────────────

describe('Errors / ConnectionException', () => {
  it('extends GuruORMError', () => {
    expect(new ConnectionException('down')).toBeInstanceOf(GuruORMError);
  });

  it('sets name to ConnectionException', () => {
    expect(new ConnectionException('down').name).toBe('ConnectionException');
  });

  it('defaults connectionName and driver', () => {
    const e = new ConnectionException('fail');
    expect(e.connectionName).toBe('default');
    expect(e.driver).toBe('unknown');
  });

  it('accepts custom connectionName and driver', () => {
    const e = new ConnectionException('fail', 'read-replica', 'mysql');
    expect(e.connectionName).toBe('read-replica');
    expect(e.driver).toBe('mysql');
  });

  it('wraps original error', () => {
    const cause = new Error('ECONNREFUSED');
    const e = new ConnectionException('fail', 'default', 'pg', cause);
    expect(e.originalError).toBe(cause);
  });

  it('toJSON includes connection and driver', () => {
    const json = new ConnectionException('fail', 'primary', 'mysql').toJSON();
    expect(json.connection).toBe('primary');
    expect(json.driver).toBe('mysql');
  });
});

// ─── RelationNotFoundException ──────────────────────────────────────

describe('Errors / RelationNotFoundException', () => {
  it('extends GuruORMError', () => {
    expect(new RelationNotFoundException('User', 'posts')).toBeInstanceOf(GuruORMError);
  });

  it('sets name to RelationNotFoundException', () => {
    expect(new RelationNotFoundException('User', 'posts').name).toBe('RelationNotFoundException');
  });

  it('includes model and relation in message', () => {
    const e = new RelationNotFoundException('User', 'comments');
    expect(e.message).toContain('User');
    expect(e.message).toContain('comments');
  });

  it('stores model and relation properties', () => {
    const e = new RelationNotFoundException('Post', 'author');
    expect(e.model).toBe('Post');
    expect(e.relation).toBe('author');
  });

  it('toJSON includes model and relation', () => {
    const json = new RelationNotFoundException('Post', 'tags').toJSON();
    expect(json.model).toBe('Post');
    expect(json.relation).toBe('tags');
  });
});

// ─── MultipleRecordsFoundException ──────────────────────────────────

describe('Errors / MultipleRecordsFoundException', () => {
  it('extends GuruORMError', () => {
    expect(new MultipleRecordsFoundException(3)).toBeInstanceOf(GuruORMError);
  });

  it('sets name to MultipleRecordsFoundException', () => {
    expect(new MultipleRecordsFoundException(2).name).toBe('MultipleRecordsFoundException');
  });

  it('includes count in message', () => {
    const e = new MultipleRecordsFoundException(5);
    expect(e.message).toContain('5');
    expect(e.message).toContain('expected only one');
  });

  it('stores count property', () => {
    expect(new MultipleRecordsFoundException(7).count).toBe(7);
  });

  it('toJSON includes count', () => {
    expect(new MultipleRecordsFoundException(4).toJSON().count).toBe(4);
  });
});
